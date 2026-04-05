from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from backend.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
def register(data: dict):
    result = auth_service.register(
        email=data.get("email", ""),
        password=data.get("password", ""),
        name=data.get("name", ""),
    )
    if "error" in result:
        return JSONResponse(content={"error": result["error"]}, status_code=400)
    return result


@router.post("/verify-email")
def verify_email(data: dict):
    result = auth_service.verify_email(
        email=data.get("email", ""),
        code=data.get("code", ""),
    )
    if "error" in result:
        return JSONResponse(content={"error": result["error"]}, status_code=400)
    return result


@router.post("/resend-verification")
def resend_verification(data: dict):
    result = auth_service.resend_verification(email=data.get("email", ""))
    if "error" in result:
        return JSONResponse(content={"error": result["error"]}, status_code=400)
    return result


@router.post("/login")
def login(data: dict):
    result = auth_service.login(
        email=data.get("email", ""),
        password=data.get("password", ""),
    )
    if "error" in result:
        return JSONResponse(content={"error": result["error"]}, status_code=401)
    return result


@router.post("/google")
def google_login(data: dict):
    credential = data.get("credential", "")
    if not credential:
        return JSONResponse(content={"error": "No credential provided"}, status_code=400)
    result = auth_service.google_login(credential)
    if "error" in result:
        return JSONResponse(content={"error": result["error"]}, status_code=401)
    return result


@router.get("/me")
def get_me(request: Request):
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""
    if not token:
        return JSONResponse(content={"error": "Not authenticated"}, status_code=401)
    user = auth_service.get_user(token)
    if not user:
        return JSONResponse(content={"error": "Invalid or expired token"}, status_code=401)
    return user


@router.put("/settings")
def update_settings(data: dict, request: Request):
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""
    return auth_service.update_settings(token, data.get("settings", {}))


@router.put("/profile")
def update_profile(data: dict, request: Request):
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""
    return auth_service.update_profile(token, name=data.get("name"))
