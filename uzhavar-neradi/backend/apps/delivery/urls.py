from django.urls import path
from .views import (AdminDeliveryList, AdminDeliveryAssign, 
AdminDeliveryComplete,DeliveryOrderListView,
DeliveryStatsView,NearbyDeliveryPartnersView,
UnassignedOrdersView,CreateDeliveryAssignmentView,
AllDeliveryPartnersView,NearestDeliveryPartnerView,
CalculateDistanceView,DeliveryPartnerStatsView,
DeliveryPartnerEarningsView)

urlpatterns = [
    path('admin/deliveries/', AdminDeliveryList.as_view(), name='admin-delivery-list'),
    path('admin/deliveries/<int:pk>/assign/', AdminDeliveryAssign.as_view(), name='admin-delivery-assign'),
    path('admin/deliveries/<int:pk>/complete/', AdminDeliveryComplete.as_view(), name='admin-delivery-complete'),
    path('orders/', DeliveryOrderListView.as_view(), name='delivery-order-list'),
    path('stats/', DeliveryStatsView.as_view(), name='delivery-stats'),
    path('nearby/', NearbyDeliveryPartnersView.as_view(), name='nearby-delivery-partners'),
    path('unassigned-orders/', UnassignedOrdersView.as_view(), name='unassigned-orders'),
    path('admin/assign/', CreateDeliveryAssignmentView.as_view(), name='admin-assign'),
    path('partners/', AllDeliveryPartnersView.as_view(), name='delivery-partners'),
    path('nearest/', NearestDeliveryPartnerView.as_view(), name='nearest-partner'),
    path('calculate-distance/', CalculateDistanceView.as_view(), name='calculate-distance'),
    path('stats/', DeliveryPartnerStatsView.as_view(), name='delivery-stats'),
    path('earnings/', DeliveryPartnerEarningsView.as_view(), name='delivery-earnings'),
]