from permissions.models import DocumentPermission


def can_user_access_document(user, document):
    """
    Checks whether a user can access a document.
    """

    # Rule 1: Must belong to same company
    if user.company != document.company:
        return False

    permissions = DocumentPermission.objects.filter(
        document=document
    )

    # Rule 2: Specific user access
    if permissions.filter(specific_user=user).exists():
        return True

    # Rule 3: Role-based access
    if permissions.filter(role=user.role).exists():
        return True

    # Rule 4: Department-based access
    if user.department:
        if permissions.filter(department=user.department).exists():
            return True

    return False