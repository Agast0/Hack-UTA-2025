from fastapi import FastAPI
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI(
    title="HackUTA Server",
    description="A FastAPI server for HackUTA project",
    version="1.0.0"
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Welcome to HackUTA Server"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "message": "Server is running properly",
            "service": "HackUTA Server"
        }
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
