from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count
from datetime import timedelta
from apps.users.models import User
from apps.users.serializers import UserDetailSerializer
from apps.orders.models import Order
from apps.orders.models import OrderItem
from .models import Setting
from .serializers import SettingSerializer

# ---------- User Approval ----------
class PendingUsersView(generics.ListAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = UserDetailSerializer
    queryset = User.objects.filter(is_approved=False, is_rejected=False, is_active=True)


# ---------- Reports ----------
class SalesReportView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        # last 30 days
        end = timezone.now()
        start = end - timedelta(days=30)
        orders = Order.objects.filter(order_date__range=[start, end])
        total_sales = orders.aggregate(total=Sum('total_amount'))['total'] or 0
        order_count = orders.count()
        # daily breakdown
        daily = orders.extra({'date': "date(order_date)"}).values('date').annotate(
            total=Sum('total_amount'), count=Count('id')
        ).order_by('date')
        return Response({
            'total_sales': total_sales,
            'order_count': order_count,
            'daily': list(daily)
        })

class TopProductsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        items = OrderItem.objects.values('product__name').annotate(
            total_quantity=Sum('quantity')
        ).order_by('-total_quantity')[:10]
        return Response(items)

# ---------- Settings ----------
class SettingListCreate(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAdminUser]
    queryset = Setting.objects.all()
    serializer_class = SettingSerializer

class SettingRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAdminUser]
    queryset = Setting.objects.all()
    serializer_class = SettingSerializer

from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Count
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from apps.users.models import User
from apps.orders.models import Order
from apps.products.models import Product
from apps.payments.models import Payment
from .models import Setting

class DashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        today = timezone.now().date()
        start_today = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
        end_today = start_today + timedelta(days=1)

        # Counts
        total_users = User.objects.count()
        total_farmers = User.objects.filter(role='farmer').count()
        total_customers = User.objects.filter(role='customer').count()
        total_delivery = User.objects.filter(role='delivery').count()
        pending_approvals = User.objects.filter(is_approved=False, is_active=True).count()
        pending_products = Product.objects.filter(is_approved=False).count()

        # Orders today
        orders_today = Order.objects.filter(order_date__range=[start_today, end_today])
        orders_today_count = orders_today.count()
        revenue_today = orders_today.aggregate(total=Sum('total_amount'))['total'] or 0

        # Recent pending users (last 5)
        recent_pending = User.objects.filter(is_approved=False, is_active=True).order_by('-date_joined')[:5]
        recent_pending_data = [
            {'id': u.id, 'username': u.username, 'email': u.email, 'role': u.role, 'date_joined': u.date_joined}
            for u in recent_pending
        ]

        # Recent orders (last 5)
        recent_orders = Order.objects.select_related('customer', 'farmer').order_by('-order_date')[:5]
        recent_orders_data = [
            {
                'id': o.id,
                'customer': o.customer.username,
                'farmer': o.farmer.username,
                'total': o.total_amount,
                'status': o.status,
                'date': o.order_date
            }
            for o in recent_orders
        ]

        # AI prediction summary (top 3 crops from predictions app)
        from apps.predictions.models import CropPrediction
        top_predictions = CropPrediction.objects.order_by('-predicted_demand')[:3]
        predictions_data = [
            {'crop': p.crop_name, 'demand': p.predicted_demand, 'profit': p.profit_margin}
            for p in top_predictions
        ]

        pending_payments = Order.objects.filter(payment_status='pending').count()
        confirmed_payments = Order.objects.filter(payment_status='paid').count()
        customer_marked = Order.objects.filter(payment_status='customer_marked').count()

        
    
        return Response({
            'total_users': total_users,
            'total_farmers': total_farmers,
            'total_customers': total_customers,
            'total_delivery': total_delivery,
            'pending_approvals': pending_approvals,
            'pending_products': pending_products,
            'orders_today': orders_today_count,
            'revenue_today': revenue_today,
            'recent_pending_users': recent_pending_data,
            'recent_orders': recent_orders_data,
            'top_predictions': predictions_data,
            'pending_payments': pending_payments,
            'confirmed_payments': confirmed_payments,
            'customer_marked': customer_marked,
        })

from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import json

class RejectUserView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id, is_approved=False, is_rejected=False, is_active=True)
        except User.DoesNotExist:
            return Response({'error': 'User not found or already approved/rejected'}, status=404)

        remark = request.data.get('remark', '')
        user.is_rejected = True
        user.save()

        # Send rejection email
        subject = "Your Uzhavar Neradi Account Application"
        html_message = render_to_string('emails/rejection_email.html', {
            'user': user,
            'remark': remark,
        })
        plain_message = strip_tags(html_message)
        send_mail(subject, plain_message, settings.DEFAULT_FROM_EMAIL, [user.email], html_message=html_message)

        return Response({'status': 'rejected'})

#...............aprove.........

from django.core.mail import send_mail
from django.conf import settings

class ApproveUserView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.all()
    serializer_class = UserDetailSerializer

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        if not user.is_approved:
            user.is_approved = True
            user.approved_at = timezone.now()
            user.save()
            # Send approval email
            subject = "Your Uzhavar Neradi Account is Approved!"
            message = f"Hello {user.username},\n\nYour account has been approved by the admin. You can now log in."
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])
        return Response({'status': 'approved'}, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)