from pydantic import BaseModel

class CallCreate(BaseModel):
    phone_number: str