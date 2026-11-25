from fastapi import APIRouter

from app.api.deps import CurrentUser, TtsServiceDep
from app.schemas.tts import SpeechRequest, SpeechResponse, VoiceList

router = APIRouter(prefix="/tts", tags=["tts"])


@router.get("/voices", response_model=VoiceList)
def list_voices(service: TtsServiceDep):
    return VoiceList(voices=service.voices, default=service.default_voice)


@router.post("/speech", response_model=SpeechResponse)
async def synthesize_speech(data: SpeechRequest, service: TtsServiceDep, user: CurrentUser):
    return await service.speak(data, user.id)
