from django.shortcuts import render

# Create your views here.
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from .models import User, OTP
from rest_framework.permissions import IsAuthenticated
from .serializers import (
    UserRegistrationSerializer, OTPVerifySerializer,
    LoginSerializer, UserDetailSerializer, 
    FarmerProfileUpdateSerializer, UserProfileUpdateSerializer
)
import secrets

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            errors = serializer.errors
            # Build a friendly error message for the user
            error_messages = []
            if 'username' in errors:
                error_messages.append("Username already taken.")
            if 'email' in errors:
                error_messages.append("Email already registered.")
            if 'phone' in errors:
                error_messages.append("Phone number already in use.")
            if 'password' in errors:
                # Password validation errors (e.g., too short)
                error_messages.append("Password does not meet requirements. Use at least 8 characters, including letters and numbers.")
            if 'land_photo' in errors:
                error_messages.append("Land photo is required for farmers.")
            if 'vehicle_photo' in errors or 'license_photo' in errors:
                error_messages.append("Vehicle and license photos are required for delivery partners.")
            if not error_messages:
                error_messages.append("Registration failed. Please check your details.")
            # Return the first friendly error message (or combine them)
            return Response({'error': error_messages[0]}, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        # Generate a truly random 6-character OTP
        otp_code = secrets.token_hex(3).upper()  # e.g., "A1B2C3"
        otp = OTP.objects.create(user=user, code=otp_code)
        otp.send_via_email()
        return Response({'message': 'OTP sent to email. Please verify.'}, status=status.HTTP_201_CREATED)



class VerifyOTPView(generics.GenericAPIView):
    serializer_class = OTPVerifySerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        code = serializer.validated_data['code']
        try:
            user = User.objects.get(email=email)
            otp = user.otps.filter(is_used=False).latest('created_at')
            if otp.code == code and otp.is_valid():
                otp.is_used = True
                otp.save()
                user.is_active = True
                user.save()
                return Response({'message': 'Email verified. Waiting for admin approval.'})
            else:
                return Response({'error': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        user = authenticate(request, username=email, password=password)
        if user and user.is_active:
            # Remove the check for is_approved here
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserDetailSerializer(user).data
            })
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

from rest_framework import generics, permissions
from .models import User
from .serializers import UserDetailSerializer

class AllUsersView(generics.ListAPIView):
    """
    List all users (admin only)
    """
    permission_classes = [permissions.IsAdminUser]
    serializer_class = UserDetailSerializer
    queryset = User.objects.all().order_by('-date_joined')
    filterset_fields = ['role', 'is_approved', 'is_active']

class UserDetailUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a specific user (admin only)
    """
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.all()
    serializer_class = UserDetailSerializer

class UpdateFarmerUPIView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FarmerProfileUpdateSerializer

    def get_object(self):
        user = self.request.user
        if user.role != 'farmer':
            self.permission_denied(self.request, message="Only farmers can update UPI ID")
        return user

class UserProfileUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileUpdateSerializer

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        user = self.get_object()
        # If the user was rejected, clear the flag and set them as pending again
        if user.is_rejected:
            user.is_rejected = False
            user.save()
        serializer.save()