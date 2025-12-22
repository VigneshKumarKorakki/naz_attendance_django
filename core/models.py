from model_utils.models import TimeStampedModel, UUIDModel


class BaseModel(TimeStampedModel, UUIDModel):
    class Meta:
        abstract = True
