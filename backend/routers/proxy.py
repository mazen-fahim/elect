from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
import httpx
import logging
from typing import Any

router = APIRouter(prefix="/proxy", tags=["proxy"])

# Configure logging
logger = logging.getLogger(__name__)

@router.api_route("/dummy-service/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_dummy_service(request: Request, path: str):
    """
    Proxy endpoint that forwards requests to the dummy service.
    This allows the frontend to make direct calls that show up in the Network tab,
    while the actual dummy service communication happens server-to-server.
    """
    try:
        # Construct the internal URL - use nginx route since we're in the same network
        internal_url = f"http://nginx/api/dummy-service/{path}"
        
        # Get request body if present
        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await request.body()
        
        # Get query parameters
        query_params = str(request.query_params) if request.query_params else ""
        if query_params:
            internal_url += f"?{query_params}"
        
        # Get headers (filter out some that shouldn't be forwarded)
        headers = dict(request.headers)
        headers_to_remove = [
            "host", "content-length", "content-encoding", 
            "transfer-encoding", "connection"
        ]
        for header in headers_to_remove:
            headers.pop(header.lower(), None)
        
        # Log the proxy request
        logger.info(f"Proxying request: {request.method} {internal_url}")
        logger.info(f"Headers: {dict(headers)}")
        if body:
            logger.info(f"Body size: {len(body)} bytes")
        
        # Make the internal request
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=request.method,
                url=internal_url,
                headers=headers,
                content=body,
                timeout=30.0
            )
            
            # Log the response
            logger.info(f"Proxy response: {response.status_code}")
            
            # Return the response with streaming to handle large responses
            return StreamingResponse(
                content=response.aiter_bytes(),
                status_code=response.status_code,
                headers=dict(response.headers)
            )
            
    except httpx.RequestError as e:
        logger.error(f"Proxy request failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to proxy request to dummy service")
    except Exception as e:
        logger.error(f"Unexpected error in proxy: {e}")
        raise HTTPException(status_code=500, detail="Internal proxy error")
