from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import OrderItem
from django_filters.rest_framework import DjangoFilterBackend
from apps.users.models import User
from apps.payments.models import Payment
from django.db.models import F
from django.core.mail import send_mail
from django.conf import settings
from apps.delivery.utils import find_nearest_delivery_partner
from apps.delivery.models import DeliveryAssignment
from django.template.loader import render_to_string
from django.utils.html import strip_tags


class CustomerPurchaseStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != 'customer':
            return Response({'detail': 'Not a customer'}, status=400)
        # Aggregate quantities per product for this customer
        items = OrderItem.objects.filter(order__customer=user)
        stats = {}
        for item in items:
            product_name = item.product.name
            stats[product_name] = stats.get(product_name, 0) + item.quantity
        # Convert to list of dicts for chart
        data = [{'product_name': name, 'quantity': qty} for name, qty in stats.items()]
        return Response(data)

from rest_framework import generics, permissions, filters
from .models import Order
from .serializers import OrderSerializer, MarkOrderPaidSerializer

class AdminOrderList(generics.ListAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = OrderSerializer
    queryset = Order.objects.all().order_by('-order_date')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['payment_status', 'status', 'customer__username']
    search_fields = ['customer__username', 'farmer__username', 'id']
    ordering_fields = ['order_date', 'total_amount', 'payment_status']

class AdminOrderDetail(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAdminUser]
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    def patch(self, request, *args, **kwargs):
        # Allow partial update (e.g., change status)
        return self.partial_update(request, *args, **kwargs)

class MarkOrderPaidView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Order.objects.all()
    serializer_class = MarkOrderPaidSerializer

    def update(self, request, *args, **kwargs):
        order = self.get_object()
        if order.customer != request.user:
            return Response({'error': 'Not your order'}, status=status.HTTP_403_FORBIDDEN)
        if order.payment_status != 'pending':
            return Response({'error': 'Order already processed'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        order.payment_status = 'customer_marked'
        order.transaction_id = serializer.validated_data.get('transaction_id', '')
        order.save()

        # Update the associated Payment record
        try:
            payment = Payment.objects.get(order=order)
            payment.status = 'customer_marked'
            payment.transaction_id = order.transaction_id
            payment.save()
        except Payment.DoesNotExist:
            # If for some reason no Payment exists, create one (shouldn't happen)
            Payment.objects.create(
                order=order,
                amount=order.total_amount,
                method=order.payment_method,
                status='customer_marked',
                transaction_id=order.transaction_id
            )

        return Response({'status': 'payment marked'})

class FarmerOrderListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        if self.request.user.role != 'farmer':
            return Order.objects.none()
        return Order.objects.filter(farmer=self.request.user).order_by('-order_date')

from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Order
from apps.products.models import Product

class FarmerDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != 'farmer':
            return Response({'error': 'Not a farmer'}, status=400)

        # Product stats
        total_products = Product.objects.filter(farmer=user).count()
        pending_products = Product.objects.filter(farmer=user, is_approved=False).count()

        # Order stats
        orders = Order.objects.filter(farmer=user)
        total_orders = orders.count()
        pending_orders = orders.filter(status='pending').count()
        completed_orders = orders.filter(status='delivered').count()

        # Earnings (sum of delivered orders)
        earnings = orders.filter(status='delivered').aggregate(total=Sum('total_amount'))['total'] or 0

        # Recent orders (last 5)
        recent_orders = orders.order_by('-order_date')[:5]
        recent_orders_data = [
            {
                'id': o.id,
                'customer': o.customer.username,
                'total': o.total_amount,
                'status': o.status,
                'payment_status': o.payment_status,
                'date': o.order_date
            }
            for o in recent_orders
        ]

        return Response({
            'total_products': total_products,
            'pending_products': pending_products,
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'completed_orders': completed_orders,
            'earnings': earnings,
            'recent_orders': recent_orders_data,
        })

class CustomerOrderListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        if self.request.user.role != 'customer':
            return Order.objects.none()
        qs = Order.objects.filter(customer=self.request.user).order_by('-order_date')
        limit = self.request.query_params.get('limit')
        if limit:
            return qs[:int(limit)]
        return qs
    
from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class CustomerStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != 'customer':
            return Response({'error': 'Not a customer'}, status=400)

        orders = Order.objects.filter(customer=user)
        total_orders = orders.count()
        total_spent = orders.aggregate(total=Sum('total_amount'))['total'] or 0
        pending_orders = orders.filter(status='pending').count()
        return Response({
            'total_orders': total_orders,
            'total_spent': total_spent,
            'pending_orders': pending_orders,
        })

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.db.models import F
from django.core.mail import send_mail
from django.conf import settings
from .models import Order, OrderItem
from .serializers import OrderSerializer
from apps.products.models import Product
from apps.payments.models import Payment
from apps.users.models import User
from apps.admin_tools.models import Setting

class OrderCreateView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer

    def create(self, request, *args, **kwargs):
        user = request.user
        data = request.data

        farmer_id = data.get('farmer')
        items_data = data.get('items', [])
        delivery_address = data.get('delivery_address')
        payment_method = data.get('payment_method')
        total_amount = data.get('total_amount')
        delivery_method = data.get('delivery_method')
        customer_lat = data.get('customer_lat')
        customer_lng = data.get('customer_lng')
        print(f"Saving order with coordinates: {customer_lat}, {customer_lng}")

        # Validate farmer
        try:
            farmer = User.objects.get(id=farmer_id, role='farmer')
        except User.DoesNotExist:
            return Response({'error': 'Invalid farmer'}, status=400)

        # Get flat delivery fee from settings
        # flat_delivery_fee = 0
        # try:
        #     fee_setting = Setting.objects.get(key='delivery_fee')
        #     flat_delivery_fee = float(fee_setting.value)
        # except Setting.DoesNotExist:
        #     pass  # default 0

        # Add delivery fee if not pickup
        
        # if delivery_method != 'pickup':
        #     total_amount = total_amount + flat_delivery_fee

        # Get delivery_fee from frontend (already calculated by CalculateDistanceView)
        delivery_fee = data.get('delivery_fee', 0)
        if delivery_method != 'pickup':
            total_amount = total_amount + delivery_fee 
        else:
            delivery_fee = 0

        # Validate stock
        insufficient_products = []
        for item in items_data:
            try:
                product = Product.objects.get(id=item['product'])
                if product.stock < item['quantity']:
                    insufficient_products.append(product.name)
            except Product.DoesNotExist:
                return Response({'error': f'Product {item["product"]} not found'}, status=400)

        if insufficient_products:
            return Response(
                {'error': f'Insufficient stock for: {", ".join(insufficient_products)}'},
                status=400
            )

        print("OrderCreateView received data:", data)

        # Create order
        order = Order.objects.create(
            customer=user,
            farmer=farmer,
            delivery_address=delivery_address,
            payment_method=payment_method,
            total_amount=total_amount,
            status='pending',
            payment_status='pending',
            delivery_method=delivery_method,
            customer_lat=customer_lat,
            customer_lng=customer_lng,
            #delivery_fee=flat_delivery_fee,
            delivery_fee=delivery_fee,
        )
        print(f"Order {order.id} saved with coordinates: {order.customer_lat}, {order.customer_lng}")
        site_url = settings.SITE_URL
        subject = f"New Order #{order.id} Received"
        html_message = render_to_string('emails/order_placed.html', {
            'farmer_name': farmer.username,
            'order_id': order.id,
            'customer_name': user.username,
            'total_amount': order.total_amount,
            'delivery_method': order.delivery_method,
            'delivery_address': order.delivery_address,
            'site_url': site_url,
        })
        plain_message = strip_tags(html_message)
        send_mail(subject, plain_message, settings.DEFAULT_FROM_EMAIL, [farmer.email], html_message=html_message)
        # Create items and update stock
        for item in items_data:
            product = Product.objects.get(id=item['product'])
            product.stock = F('stock') - item['quantity']
            product.save(update_fields=['stock'])
            product.refresh_from_db()

            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=item['quantity'],
                price=product.price
            )

            if product.stock == 0:
                send_mail(
                    subject="Your product is out of stock",
                    message=f"Your product '{product.name}' is now out of stock.",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[product.farmer.email],
                    fail_silently=True,
                )

        # Create payment record
        Payment.objects.create(
            order=order,
            amount=total_amount,
            method=payment_method,
            status='pending',
            transaction_id=None
        )

        serializer = self.get_serializer(order)
        return Response(serializer.data, status=201)

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from apps.delivery.models import DeliveryAssignment
from apps.delivery.utils import find_nearest_delivery_partner

class FarmerOrderUpdateView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    queryset = Order.objects.all()

    def get_queryset(self):
        return Order.objects.filter(farmer=self.request.user)

    def patch(self, request, *args, **kwargs):
        order = self.get_object()
        new_status = request.data.get('status')
        allowed_statuses = ['confirmed', 'shipped']
        print(f"[DEBUG] Order {order.id} – current status: {order.status}, delivery_method: {order.delivery_method}")
        print(f"[DEBUG] New status from request: {new_status}")

        # For farmer drop, allow delivered after shipped
        if order.delivery_method == 'drop' and new_status == 'delivered':
            if order.status != 'shipped':
                return Response({'error': 'Order must be shipped before delivered'}, status=400)
            # Allow delivered
        elif order.delivery_method == 'pickup':
            if new_status == 'delivered':
                return Response({'error': 'Customer must confirm pickup'}, status=400)
            allowed_statuses = ['confirmed', 'shipped']
        elif order.delivery_method == 'delivery':
            allowed_statuses = ['confirmed', 'shipped']
        else:
            allowed_statuses = ['confirmed', 'shipped']

        if new_status not in allowed_statuses and not (order.delivery_method == 'drop' and new_status == 'delivered'):
            return Response({'error': 'You can only update to confirmed, shipped, or delivered (for farmer drop)'}, status=400)

        # Update status
        order.status = new_status
        order.save()
        print(f"[DEBUG] Order {order.id} saved with new status: {order.status}")
        # Auto-assign delivery partner if order is shipped and uses delivery partner
        if new_status == 'shipped' and order.delivery_method == 'delivery':
            print(f"[DEBUG] Entering auto-assignment block for order {order.id}")
            print(f"[DEBUG] Customer coordinates: lat={order.customer_lat}, lng={order.customer_lng}")
            # Only assign if not already assigned
            if not DeliveryAssignment.objects.filter(order=order).exists():
                if order.customer_lat and order.customer_lng:
                    print(f"[DEBUG] Calling find_nearest_delivery_partner with ({order.customer_lat}, {order.customer_lng})")
                    partner = find_nearest_delivery_partner(order.customer_lat, order.customer_lng)
                    print(f"[DEBUG] Partner found: {partner}")
                    if partner:
                        assignment = DeliveryAssignment.objects.create(order=order, delivery_partner=partner)
                        print(f"[DEBUG] Assignment created: {assignment}")
                        # Send email to the assigned partner
                        site_url = settings.SITE_URL
                        subject = f"New Delivery Assignment – Order #{order.id}"
                        html_message = render_to_string('emails/delivery_assigned.html', {
                            'partner_name': partner.username,
                            'order_id': order.id,
                            'customer_name': order.customer.username,
                            'delivery_address': order.delivery_address,
                            'total_amount': order.total_amount,
                            'site_url': site_url,
                        })
                        plain_message = strip_tags(html_message)
                        send_mail(
                            subject, plain_message,
                            settings.DEFAULT_FROM_EMAIL, [partner.email],
                            html_message=html_message
                        )
                    else:
                        print(f"No delivery partner found for order {order.id}")
                        print("[DEBUG] No partner found")
                else:
                    print(f"Customer coordinates missing for order {order.id}")
                    print("[DEBUG] Customer coordinates missing")
            else:
                print("[DEBUG] Delivery assignment already exists")
        else:
            print(f"[DEBUG] Auto-assignment not triggered (status={new_status}, delivery_method={order.delivery_method})")

        return Response({'status': 'updated'})
        
class DeliveryOrderUpdateView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    queryset = Order.objects.all()

    def get_queryset(self):
        # Delivery partners can only update orders assigned to them
        return Order.objects.filter(deliveryassignment__delivery_partner=self.request.user)

    def patch(self, request, *args, **kwargs):
        order = self.get_object()
        new_status = request.data.get('status')
        remark = request.data.get('remark')

        allowed_statuses = ['out_for_delivery', 'delivered', 'not_delivered']
        if new_status not in allowed_statuses:
            return Response({'error': 'Invalid status update'}, status=400)

        if new_status == 'not_delivered' and not remark:
            return Response({'error': 'Remark required for not delivered'}, status=400)

        if new_status == 'not_delivered':
            order.delivery_remark = remark
        elif new_status == 'delivered':
            order.delivered_at = timezone.now()

        order.status = new_status
        order.save()
        return Response({'status': 'updated'})

class CustomerCancelOrderView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user)

    def patch(self, request, *args, **kwargs):
        order = self.get_object()
        reason = request.data.get('reason')
        if order.status != 'pending':
            return Response({'error': 'Only pending orders can be cancelled'}, status=400)
        if not reason:
            return Response({'error': 'Cancellation reason required'}, status=400)

        order.status = 'cancelled'
        order.cancellation_reason = reason
        order.cancelled_by = request.user
        order.save()
        return Response({'status': 'cancelled'})

class FarmerSalesStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != 'farmer':
            return Response({'error': 'Not a farmer'}, status=400)

        # Aggregate quantity sold for each product from all non-cancelled orders
        items = OrderItem.objects.filter(
            order__farmer=user,
            order__status__in=['pending', 'confirmed', 'shipped', 'delivered']
        ).values('product__name').annotate(total_sold=Sum('quantity')).order_by('-total_sold')

        data = [
            {'product_name': item['product__name'], 'quantity': item['total_sold']}
            for item in items
        ]
        return Response(data)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from apps.users.models import User
from apps.users.utils import haversine_distance

class CalculateDistanceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        farmer_id = request.data.get('farmer_id')
        customer_lat = request.data.get('customer_lat')
        customer_lng = request.data.get('customer_lng')
        print("Distance calculation called with:", request.data)

        if not farmer_id:
            return Response({'error': 'farmer_id required'}, status=400)

        try:
            farmer = User.objects.get(id=farmer_id, role='farmer')
        except User.DoesNotExist:
            return Response({'error': 'Farmer not found'}, status=404)

        # If coordinates are missing, use flat fee from settings
        if customer_lat is None or customer_lng is None or not farmer.latitude or not farmer.longitude:
            flat_fee = 0
            try:
                fee_setting = Setting.objects.get(key='delivery_fee')
                flat_fee = float(fee_setting.value)
            except Setting.DoesNotExist:
                pass
            return Response({'distance': None, 'fee': flat_fee})

        distance = haversine_distance(
            farmer.latitude, farmer.longitude,
            float(customer_lat), float(customer_lng)
        )
        per_km = float(Setting.objects.get(key='delivery_charge').value)
        fee = distance * per_km
        #fee = distance * 5
        return Response({'distance': round(distance, 2), 'fee': round(fee, 2)})
        
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from apps.delivery.utils import find_nearest_delivery_partner

class NearestDeliveryPartnerView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        if not lat or not lng:
            return Response({'error': 'Missing coordinates'}, status=400)
        partner = find_nearest_delivery_partner(float(lat), float(lng))
        if partner:
            return Response({'id': partner.id, 'username': partner.username})
        return Response({'error': 'No partner found'}, status=404)

class CustomerPickupDeliveredView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user)

    def patch(self, request, *args, **kwargs):
        order = self.get_object()
        if order.delivery_method != 'pickup':
            return Response({'error': 'Not a pickup order'}, status=400)
        if order.status != 'shipped':
            return Response({'error': 'Order not ready for pickup'}, status=400)
        order.status = 'delivered'
        order.save()
        return Response({'status': 'delivered'})