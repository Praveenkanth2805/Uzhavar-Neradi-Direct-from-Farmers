from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, OTP

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    land_photo = serializers.ImageField(required=False, allow_null=True)
    vehicle_photo = serializers.ImageField(required=False, allow_null=True)
    license_photo = serializers.ImageField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'phone', 'role', 'language',
                  'land_photo', 'vehicle_photo', 'license_photo','address')

    def validate(self, data):
        role = data.get('role')
        if role == 'farmer' and not data.get('land_photo'):
            raise serializers.ValidationError("Land photo is required for farmers")
        if role == 'delivery':
            if not data.get('vehicle_photo'):
                raise serializers.ValidationError("Vehicle photo is required for delivery partners")
            if not data.get('license_photo'):
                raise serializers.ValidationError("License photo is required for delivery partners")
        return data

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.is_active = False  # will be activated after OTP
        user.save()
        return user

class OTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

class UserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone', 'role', 'is_approved', 'language',
                  'land_photo', 'vehicle_photo', 'license_photo', 'date_joined')
                  
class UserDetailSerializer(serializers.ModelSerializer):
   class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone', 'role', 'is_approved', 'is_active', 'is_rejected',
                  'language', 'upi_id', 'address', 'latitude', 'longitude',
                  'land_photo', 'vehicle_photo', 'license_photo', 'rejection_reason', 'date_joined')

class FarmerProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('upi_id','address')

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('address', 'phone', 'language','latitude', 'longitude','upi_id')  # add fields you want customers to update