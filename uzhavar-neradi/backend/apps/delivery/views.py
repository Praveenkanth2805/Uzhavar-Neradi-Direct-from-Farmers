from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.utils import timezone
from .models import DeliveryAssignment
from apps.users.models import User
from .serializers import DeliveryAssignmentSerializer
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

class AdminDeliveryList(generics.ListAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = DeliveryAssignmentSerializer
    queryset = DeliveryAssignment.objects.all().order_by('-assigned_at')

class AdminDeliveryAssign(generics.UpdateAPIView):
    permission_classes = [permissions.IsAdminUser]
    queryset = DeliveryAssignment.objects.all()
    serializer_class = DeliveryAssignmentSerializer

    def patch(self, request, *args, **kwargs):
        delivery = self.get_object()
        partner_id = request.data.get('delivery_partner_id')
        try:
            partner = User.objects.get(id=partner_id, role='delivery')
            delivery.delivery_partner = partner
            delivery.save()
            site_url = settings.SITE_URL
            # Inside the assignment method
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
            send_mail(subject, plain_message, settings.DEFAULT_FROM_EMAIL, [partner.email], html_message=html_message)
            
            return Response({'status': 'assigned'})
        except User.DoesNotExist:
            return Response({'error': 'Invalid delivery partner'}, status=status.HTTP_400_BAD_REQUEST)

class AdminDeliveryComplete(generics.UpdateAPIView):
    permission_classes = [permissions.IsAdminUser]
    queryset = DeliveryAssignment.objects.all()
    serializer_class = DeliveryAssignmentSerializer

    def patch(self, request, *args, **kwargs):
        delivery = self.get_object()
        delivery.delivered_at = timezone.now()
        delivery.save()
        # Also mark order as delivered
        delivery.order.status = 'delivered'
        delivery.order.save()
        return Response({'status': 'delivered'})

from rest_framework import generics, permissions
from rest_framework.response import Response
from django.utils import timezone
from .models import DeliveryAssignment
from apps.orders.models import Order
from apps.orders.serializers import OrderSerializer

class DeliveryOrderListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        if self.request.user.role != 'delivery':
            return Order.objects.none()
        # Assuming DeliveryAssignment links delivery partner to order
        return Order.objects.filter(deliveryassignment__delivery_partner=self.request.user).order_by('-order_date')

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from apps.orders.models import Order

class DeliveryStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != 'delivery':
            return Response({'error': 'Not a delivery partner'}, status=400)

        orders = Order.objects.filter(deliveryassignment__delivery_partner=user)
        total_assigned = orders.count()
        delivered = orders.filter(status='delivered').count()
        out_for_delivery = orders.filter(status='out_for_delivery').count()
        not_delivered = orders.filter(status='not_delivered').count()

        recent_deliveries = orders.order_by('-order_date')[:5]
        recent_data = [
            {
                'id': o.id,
                'customer': o.customer.username,
                'address': o.delivery_address,
                'status': o.status,
                'date': o.order_date
            }
            for o in recent_deliveries
        ]

        return Response({
            'total_assigned': total_assigned,
            'delivered': delivered,
            'out_for_delivery': out_for_delivery,
            'not_delivered': not_delivered,
            'recent_deliveries': recent_data,
        })

from rest_framework import generics, permissions
from rest_framework.response import Response
from apps.users.models import User
from apps.users.serializers import UserDetailSerializer
from apps.users.utils import haversine_distance

class NearbyDeliveryPartnersView(generics.ListAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = UserDetailSerializer

    def get_queryset(self):
        return User.objects.filter(role='delivery', is_approved=True)

    def list(self, request, *args, **kwargs):
        # Get target coordinates from request (customer address of an order)
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        if not lat or not lng:
            return Response({'error': 'Latitude and longitude required'}, status=400)

        try:
            lat = float(lat)
            lng = float(lng)
        except ValueError:
            return Response({'error': 'Invalid coordinates'}, status=400)

        partners = self.get_queryset()
        # Compute distance for each partner
        partner_list = []
        for p in partners:
            if p.latitude and p.longitude:
                dist = haversine_distance(lat, lng, p.latitude, p.longitude)
                partner_list.append({
                    'id': p.id,
                    'username': p.username,
                    'distance': round(dist, 2),
                    'latitude': p.latitude,
                    'longitude': p.longitude,
                })
        # Sort by distance
        partner_list.sort(key=lambda x: x['distance'])
        return Response(partner_list)

from rest_framework import generics, permissions
from apps.orders.models import Order
from apps.orders.serializers import OrderSerializer

class UnassignedOrdersView(generics.ListAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = OrderSerializer

    def get_queryset(self):
        # Orders that are shipped and have no delivery assignment
        return Order.objects.filter(
            status='shipped',
            deliveryassignment__isnull=True
        ).order_by('-order_date')

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import DeliveryAssignment
from apps.orders.models import Order
from apps.users.models import User

class CreateDeliveryAssignmentView(generics.CreateAPIView):
    permission_classes = [permissions.IsAdminUser]
    queryset = DeliveryAssignment.objects.all()
    serializer_class = DeliveryAssignmentSerializer  # you'll need a serializer

    def create(self, request, *args, **kwargs):
        order_id = request.data.get('order_id')
        partner_id = request.data.get('delivery_partner_id')

        try:
            order = Order.objects.get(id=order_id, status='shipped')
        except Order.DoesNotExist:
            return Response({'error': 'Order not found or not ready'}, status=400)

        try:
            partner = User.objects.get(id=partner_id, role='delivery', is_approved=True)
        except User.DoesNotExist:
            return Response({'error': 'Invalid delivery partner'}, status=400)

        assignment = DeliveryAssignment.objects.create(
            order=order,
            delivery_partner=partner
        )
        serializer = self.get_serializer(assignment)
        return Response(serializer.data, status=201)
    
from rest_framework import generics, permissions
from apps.users.models import User
from apps.users.serializers import UserDetailSerializer

class AllDeliveryPartnersView(generics.ListAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = UserDetailSerializer
    queryset = User.objects.filter(role='delivery', is_approved=True).order_by('username')

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from .utils import find_nearest_delivery_partner

class NearestDeliveryPartnersView(APIView):
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
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from .utils import find_nearest_delivery_partner

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
    
class CalculateDistanceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        farmer_id = request.data.get('farmer_id')
        address = request.data.get('address')
        if not farmer_id or not address:
            return Response({'error': 'farmer_id and address required'}, status=400)
        try:
            farmer = User.objects.get(id=farmer_id, role='farmer')
        except User.DoesNotExist:
            return Response({'error': 'Farmer not found'}, status=404)

        # Geocode customer address (using stored coordinates or geocode)
        cust_lat, cust_lng = geocode_address(address)
        if not cust_lat or not cust_lng:
            return Response({'error': 'Could not geocode address'}, status=400)

        # Use farmer's stored coordinates
        if not farmer.latitude or not farmer.longitude:
            # Attempt to geocode farmer's address
            farm_lat, farm_lng = geocode_address(farmer.address)
            if not farm_lat or not farm_lng:
                return Response({'error': 'Farmer location not available'}, status=400)
            farmer.latitude = farm_lat
            farmer.longitude = farm_lng
            farmer.save()
            farm_lat, farm_lng = farm_lat, farm_lng
        else:
            farm_lat, farm_lng = farmer.latitude, farmer.longitude

        distance = haversine_distance(cust_lat, cust_lng, farm_lat, farm_lng)
        per_km = float(Setting.objects.get(key='delivery_charge').value)
        fee = distance * per_km
        #fee = distance * 5
        return Response({'distance': round(distance, 2), 'fee': round(fee, 2)})
class DeliveryPartnerStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != 'delivery':
            return Response({'error': 'Not a delivery partner'}, status=400)

        # Sum of delivery fees from orders assigned to this partner that are delivered
        total_earnings = Order.objects.filter(
            deliveryassignment__delivery_partner=user,
            status='delivered'
        ).aggregate(total=Sum('delivery_fee'))['total'] or 0

        # You could also include number of deliveries, etc.
        return Response({
            'total_earnings': total_earnings,
        })