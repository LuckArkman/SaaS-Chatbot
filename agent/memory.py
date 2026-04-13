from typing import List
from .models import Message, Role

class MemoryManager:
    def __init__(self, system_prompt: str = None):
        self.messages: List[Message] = []
        if system_prompt:
            self.add_message(Role.SYSTEM, system_prompt)

    def add_message(self, role: Role, content: str):
        self.messages.append(Message(role=role, content=content))

    def get_context(self) -> List[Message]:
        return self.messages

    def clear(self, system_prompt: str = None):
        self.messages = []
        if system_prompt:
            self.add_message(Role.SYSTEM, system_prompt)
