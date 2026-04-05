from fastapi import APIRouter, HTTPException, Request
from backend.models.stock import ChatRequest, AnalyzeRequest
from backend.services import ai_service, stock_data, news_service, chat_service, auth_service
from backend.services.scoring_engine import compute_score

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _get_user_id(request: Request):
    """Extract user ID from auth token if present."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        user = auth_service.get_user(token)
        if user:
            return user["id"]
    return None


@router.post("/analyze")
def analyze(req: AnalyzeRequest):
    ticker = req.ticker.upper()
    detail = stock_data.get_detailed_stock(ticker)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")

    info = stock_data.get_stock_info(ticker)
    history = stock_data.get_price_history(ticker, "1y")
    score = compute_score(info, history)

    # Gather additional context
    hist_summary = stock_data.get_historical_summary(ticker)
    news = news_service.get_stock_news(ticker)
    etf_data = stock_data.get_etf_holdings(ticker) if detail.get("isETF") else None

    analysis = ai_service.analyze_stock(ticker, detail, score, hist_summary, news, etf_data)
    return {"ticker": ticker, "analysis": analysis}


@router.post("/chat")
def chat(req: ChatRequest, request: Request):
    user_id = _get_user_id(request)
    convo_id = None

    # Check for conversationId in request body
    body = {}
    try:
        import json
        body_bytes = getattr(request, '_body', None)
    except Exception:
        pass

    response = ai_service.chat(req.message, req.history)

    # Save to chat history if user is logged in and conversationId provided
    if user_id and hasattr(req, 'conversationId') and req.conversationId:
        chat_service.add_message(user_id, req.conversationId, "user", req.message)
        chat_service.add_message(user_id, req.conversationId, "assistant", response)

    return {"response": response}


# ── Chat History Endpoints ──

@router.get("/conversations")
def get_conversations(request: Request):
    user_id = _get_user_id(request)
    if not user_id:
        return []
    return chat_service.get_conversations(user_id)


@router.post("/conversations")
def create_conversation(request: Request, data: dict = {}):
    user_id = _get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    title = data.get("title", "New Chat")
    return chat_service.create_conversation(user_id, title)


@router.get("/conversations/{convo_id}")
def get_conversation_messages(convo_id: str, request: Request):
    user_id = _get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return chat_service.get_messages(user_id, convo_id)


@router.put("/conversations/{convo_id}")
def rename_conversation(convo_id: str, data: dict, request: Request):
    user_id = _get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return chat_service.rename_conversation(user_id, convo_id, data.get("title", ""))


@router.delete("/conversations/{convo_id}")
def delete_conversation(convo_id: str, request: Request):
    user_id = _get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return chat_service.delete_conversation(user_id, convo_id)


@router.post("/conversations/{convo_id}/messages")
def add_message(convo_id: str, data: dict, request: Request):
    user_id = _get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    role = data.get("role", "user")
    content = data.get("content", "")
    return chat_service.add_message(user_id, convo_id, role, content)


@router.post("/conversations/{convo_id}/chat")
def chat_in_conversation(convo_id: str, data: dict, request: Request):
    """Send a message in a conversation and get AI response, saving both."""
    user_id = _get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    message = data.get("message", "")
    history = data.get("history", [])

    # Check if this is the first message so we can auto-generate a title
    existing = chat_service.get_messages(user_id, convo_id)
    is_first_message = len(existing) == 0

    # Save user message
    chat_service.add_message(user_id, convo_id, "user", message)

    # Get AI response
    response = ai_service.chat(message, history)

    # Save assistant response
    chat_service.add_message(user_id, convo_id, "assistant", response)

    # On first message: generate a smart AI title and persist it
    generated_title = None
    if is_first_message:
        generated_title = ai_service.generate_chat_title(message, response)
        chat_service.rename_conversation(user_id, convo_id, generated_title)

    result = {"response": response}
    if generated_title:
        result["title"] = generated_title
    return result
