from math import radians, cos, sin, asin, sqrt

def haversine_distance(lat1, lon1, lat2, lon2):
    # convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    km = 6371 * c
    return km

def find_nearest_delivery_partner(customer_lat, customer_lng):
    """
    Returns the nearest approved delivery partner with coordinates.
    Uses straight‑line (Haversine) distance.
    """
    print(f"Finding nearest partner for lat={customer_lat}, lng={customer_lng}")
    from apps.users.models import User
    partners = User.objects.filter(role='delivery', is_approved=True, latitude__isnull=False, longitude__isnull=False)
    print(f"Found {partners.count()} delivery partners with coordinates")
    if not partners:
        return None

    best = None
    min_dist = float('inf')
    for p in partners:
        dist = haversine_distance(customer_lat, customer_lng, p.latitude, p.longitude)
        if dist < min_dist:
            min_dist = dist
            best = p
    return best