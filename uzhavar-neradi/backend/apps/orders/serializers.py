from rest_framework import serializers
from .models import Order, OrderItem

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = OrderItem
        fields = '__all__'

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.username', read_only=True)
    farmer_name = serializers.CharField(source='farmer.username', read_only=True)
    cancelled_by_username = serializers.CharField(source='cancelled_by.username', read_only=True)
    customer_lat = serializers.DecimalField(source='customer.latitude', read_only=True, max_digits=9, decimal_places=6)
    customer_lng = serializers.DecimalField(source='customer.longitude', read_only=True, max_digits=9, decimal_places=6)
    delivery_partner_name = serializers.CharField(source='deliveryassignment.delivery_partner.username', read_only=True, allow_null=True)
    delivery_remark = serializers.CharField(source='deliveryassignment.remarks', read_only=True, allow_null=True)

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ('order_date',)

class DeliveryOrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.username', read_only=True)
    assignment_id = serializers.IntegerField(source='deliveryassignment.id', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'customer_name', 'delivery_address', 'status', 'total_amount', 'order_date', 'assignment_id']

        
class MarkOrderPaidSerializer(serializers.Serializer):
    transaction_id = serializers.CharField(required=False, allow_blank=True)