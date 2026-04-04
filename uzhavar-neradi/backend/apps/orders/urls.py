from django.urls import path
from .views import CustomerPurchaseStatsView
from .views import  (AdminOrderList, AdminOrderDetail,
MarkOrderPaidView,FarmerOrderListView,
FarmerDashboardStatsView,CustomerOrderListView,
CustomerStatsView, OrderCreateView,FarmerOrderUpdateView,
DeliveryOrderUpdateView,CustomerCancelOrderView,FarmerSalesStatsView,
CalculateDistanceView,CustomerPickupDeliveredView,
AssignDeliveryPartnerForDropOrderView,)


urlpatterns = [
    path('customer-stats/', CustomerPurchaseStatsView.as_view(), name='customer-stats'),
    path('admin/orders/', AdminOrderList.as_view(), name='admin-order-list'),
    path('admin/orders/<int:pk>/', AdminOrderDetail.as_view(), name='admin-order-detail'),
    path('<int:pk>/mark-paid/', MarkOrderPaidView.as_view(), name='mark-paid'),
    path('farmer/orders/', FarmerOrderListView.as_view(), name='farmer-order-list'),
    path('farmer/stats/', FarmerDashboardStatsView.as_view(), name='farmer-stats'),
    path('customer/orders/', CustomerOrderListView.as_view(), name='customer-order-list'),
    path('customer/stats/', CustomerStatsView.as_view(), name='customer-stats'),
    path('create/', OrderCreateView.as_view(), name='order-create'),
    path('farmer/orders/<int:pk>/update/', FarmerOrderUpdateView.as_view(), name='farmer-order-update'),
    path('delivery/orders/<int:pk>/update/', DeliveryOrderUpdateView.as_view(), name='delivery-order-update'),
    path('customer/orders/<int:pk>/cancel/', CustomerCancelOrderView.as_view(), name='customer-order-cancel'),
    path('farmer/sales-stats/', FarmerSalesStatsView.as_view(), name='farmer-sales-stats'),
    path('calculate-distance/', CalculateDistanceView.as_view(), name='calculate-distance'),
    path('customer/orders/<int:pk>/pickup/', CustomerPickupDeliveredView.as_view(), name='customer-pickup'),
    path('<int:order_id>/assign-delivery-partner/', AssignDeliveryPartnerForDropOrderView.as_view(), name='assign-delivery-partner'),
]
