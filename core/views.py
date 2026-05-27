from django.shortcuts import render

def login_view(request):
    """Renders the dark glassmorphic login screen."""
    return render(request, "login.html")

def dashboard(request):
    """Renders the main dashboard skeleton workspace."""
    return render(request, "dashboard.html")
