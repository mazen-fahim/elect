from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from schemas.auth import FieldNames, LoginErrorResponse, RegisterOrganizationErrorResponse


def handle_error(request: Request, exc: HTTPException):
    # Map detail to your schema
    match exc.detail:
        # /api/auth/register Error Handling
        case "err.register.email":
            message = "Email already exists"
            return JSONResponse(
                status_code=exc.status_code,
                content=RegisterOrganizationErrorResponse(
                    field=FieldNames.email,
                    error_message=message,
                ).model_dump(),
            )
        case "err.register.name":
            message = "Name already exists"
            return JSONResponse(
                status_code=exc.status_code,
                content=RegisterOrganizationErrorResponse(
                    field=FieldNames.org_name,
                    error_message=message,
                ).model_dump(),
            )
        case "err.register.api_endpoint":
            message = "Api endpoint already exists"
            return JSONResponse(
                status_code=exc.status_code,
                content=RegisterOrganizationErrorResponse(
                    field=FieldNames.api_endpoint,
                    error_message=message,
                ).model_dump(),
            )
        # /api/auth/login Error Handling
        case "err.login.credentials":
            message = "Invalid Credentials"
            return JSONResponse(
                status_code=exc.status_code,
                content=LoginErrorResponse(
                    error_message=message,
                ).model_dump(),
            )

        case "err.login.inactive":
            message = "User is inactive"
            return JSONResponse(
                status_code=exc.status_code,
                content=LoginErrorResponse(
                    error_message=message,
                ).model_dump(),
            )

        case _:
            # Default case - return the original HTTPException as JSON
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail}
            )
