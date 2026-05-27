from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from permissions.permissions import IsAdminOrManager
from companies.models import Company
from .models import User


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "email": request.user.email,
            "company": request.user.company.name if request.user.company else None,
            "role": request.user.role
        })


class CompanyUsersView(APIView):
    permission_classes = [IsAdminOrManager]

    def get(self, request):
        users = User.objects.filter(company=request.user.company, is_active=True)

        return Response([
            {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "company": user.company.name,
                "department": user.department
            }
            for user in users
        ])


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        full_name = request.data.get("full_name")
        role = request.data.get("role", "").lower()
        company_name = request.data.get("company_name", "").strip()
        department = request.data.get("department", "")

        if not email or not password or not full_name or not role:
            return Response({"detail": "All fields are required."}, status=400)

        if role not in ["manager", "employee", "customer"]:
            return Response({"detail": "Invalid role selected."}, status=400)

        if not company_name:
            return Response({"detail": "Company name is required."}, status=400)

        if User.objects.filter(email=email).exists():
            return Response({"detail": "Email is already registered."}, status=400)

        if role == "manager":
            company, created = Company.objects.get_or_create(name=company_name)
            user = User.objects.create_user(
                email=email,
                password=password,
                full_name=full_name,
                role="manager",
                company=company,
                department=department,
                is_active=True,
                approval_status="approved"
            )
            return Response({"detail": "Manager account and company created successfully!"}, status=201)

        elif role == "employee":
            company = Company.objects.filter(name__iexact=company_name).first()
            if not company:
                return Response({"detail": "Company not found. Please register the company as a Manager first."}, status=400)

            user = User.objects.create_user(
                email=email,
                password=password,
                full_name=full_name,
                role="employee",
                company=company,
                department=department,
                is_active=False,
                approval_status="pending"
            )
            return Response({"detail": "Employee registration submitted! Pending Manager approval."}, status=201)

        elif role == "customer":
            company = Company.objects.filter(name__iexact=company_name).first()
            if not company:
                return Response({"detail": "Company not found. Please register the company as a Manager first."}, status=400)

            user = User.objects.create_user(
                email=email,
                password=password,
                full_name=full_name,
                role="customer",
                company=company,
                department=department,
                is_active=True,
                approval_status="approved"
            )
            return Response({"detail": "General user account created successfully!"}, status=201)


class PendingEmployeesView(APIView):
    permission_classes = [IsAdminOrManager]

    def get(self, request):
        if not request.user.company:
            return Response([])
        
        users = User.objects.filter(
            company=request.user.company,
            role="employee",
            approval_status="pending"
        )
        return Response([
            {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "department": user.department,
                "approval_status": user.approval_status
            }
            for user in users
        ])


class ApproveEmployeeView(APIView):
    permission_classes = [IsAdminOrManager]

    def post(self, request):
        employee_id = request.data.get("employee_id")
        action = request.data.get("action")

        if not employee_id or action not in ["approve", "deny"]:
            return Response({"detail": "Invalid action parameters."}, status=400)

        try:
            employee = User.objects.get(
                id=employee_id,
                company=request.user.company,
                role="employee"
            )
        except User.DoesNotExist:
            return Response({"detail": "Pending employee registration not found."}, status=404)

        if action == "approve":
            employee.approval_status = "approved"
            employee.is_active = True
            employee.save()
            return Response({"detail": "Employee registration approved successfully!"})
        else:
            employee.approval_status = "denied"
            employee.is_active = False
            employee.save()
            return Response({"detail": "Employee registration denied."})