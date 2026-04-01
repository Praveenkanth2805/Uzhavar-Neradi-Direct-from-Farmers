from rest_framework import generics, permissions, filters, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.utils import timezone
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer

# -------------------- Admin Product Views --------------------
class AdminProductList(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = ProductSerializer
    queryset = Product.objects.all().order_by('-created_at')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'farmer__username']
    ordering_fields = ['price', 'created_at', 'stock']

class AdminProductDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAdminUser]
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

class AdminProductApprove(generics.UpdateAPIView):
    permission_classes = [permissions.IsAdminUser]
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def update(self, request, *args, **kwargs):
        product = self.get_object()
        product.is_approved = True
        product.approved_at = timezone.now()
        product.save()
        return Response({'status': 'approved'})

    def post(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)


# -------------------- Category Views --------------------
class CategoryListCreate(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        # Allow any authenticated user to view categories,
        # but only admin can create new categories.
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

class CategoryRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAdminUser]
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


# -------------------- Farmer Product View --------------------
class FarmerProductListCreateView(generics.ListCreateAPIView):
    """
    Handles both:
    - GET  : List products belonging to the authenticated farmer.
    - POST : Create a new product as the authenticated farmer (with image).
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProductSerializer
    parser_classes = [MultiPartParser, FormParser]   # <-- for file upload

    def get_queryset(self):
        if self.request.user.role != 'farmer':
            return Product.objects.none()
        return Product.objects.filter(farmer=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        if self.request.user.role != 'farmer':
            self.permission_denied(self.request, message="Only farmers can create products")
        serializer.save(farmer=self.request.user, is_approved=False)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("Validation errors:", serializer.errors)   # for debugging
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class FarmerProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProductSerializer
    queryset = Product.objects.all()

    def get_queryset(self):
        if self.request.user.role != 'farmer':
            return Product.objects.none()
        return Product.objects.filter(farmer=self.request.user)

class CustomerProductListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at']

    def get_queryset(self):
        qs = Product.objects.filter(is_approved=True)
        user = self.request.user
        if user.role == 'farmer':
            # Exclude products from the logged-in farmer
            qs = qs.exclude(farmer=user)
        return qs.order_by('-created_at')