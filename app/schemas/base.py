from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Trường Python giữ snake_case, JSON gửi/nhận dùng camelCase để khớp frontend."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)