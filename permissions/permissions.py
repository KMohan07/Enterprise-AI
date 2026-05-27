from rest_framework.permissions import BasePermission


class IsManager(BasePermission):
    def has_permission(self, request, view):
        user = request.user

        return (
            user.is_authenticated
            and user.is_active
            and user.company is not None
            and user.role == "manager"
        )

class IsEmployeeOrManager(BasePermission):
    def has_permission(self, request, view):
        user = request.user

        return (
            user.is_authenticated
            and user.is_active
            and user.company is not None
            and user.role in ["employee", "manager"]
        )
    
class IsAdminOrManager(BasePermission):
    def has_permission(self, request, view):
        user = request.user

        return (
            user.is_authenticated
            and user.is_active
            and user.company is not None
            and user.role in ["admin", "manager"]
        )

class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "customer"
        )


class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        user = request.user

        return (
            user.is_authenticated
            and user.is_active
            and user.company is not None
            and user.role == "customer"
        )