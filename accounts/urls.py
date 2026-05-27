from django.urls import path
from .views import MeView, CompanyUsersView, RegisterView, PendingEmployeesView, ApproveEmployeeView

urlpatterns = [
    path("me/", MeView.as_view()),
    path("users/", CompanyUsersView.as_view()),
    path("register/", RegisterView.as_view()),
    path("pending-employees/", PendingEmployeesView.as_view()),
    path("approve-employee/", ApproveEmployeeView.as_view()),
]