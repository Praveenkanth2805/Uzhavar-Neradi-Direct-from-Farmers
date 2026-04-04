from django.db import models
from apps.users.models import User
from apps.products.models import Product
from django.conf import settings

class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('not_delivered', 'Not Delivered'),
        ('cancelled', 'Cancelled'),
    )
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders', limit_choices_to={'role': 'customer'})
    farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sales')
    order_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    delivery_method = models.CharField(max_length=20, choices=(
        ('pickup', 'Customer Pickup'),
        ('drop', 'Farmer Drop'),
        ('delivery', 'Delivery Partner'),
    ))
    
    delivery_address = models.TextField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=(('cod', 'COD'), ('upi', 'UPI/QR')))
    is_paid = models.BooleanField(default=False)
    PAYMENT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('customer_marked', 'Customer Marked as Paid'),  # optional intermediate
    )
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    transaction_id = models.CharField(max_length=100, blank=True, null=True, help_text="UPI transaction reference (optional)")
    paid_at = models.DateTimeField(null=True, blank=True)

    cancellation_reason = models.TextField(blank=True, null=True)
    delivery_remark = models.TextField(blank=True, null=True)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    customer_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    customer_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    preorder_date = models.DateField(null=True, blank=True, help_text="Customer requested preorder delivery/pickup date")
    is_preorder = models.BooleanField(default=False)
    
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelled_orders'
    )

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)