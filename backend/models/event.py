from dataclasses import dataclass, field
from typing import Optional

@dataclass
class Event:
    event_num: int
    clip_name: Optional[str] = None
    file_name: Optional[str] = None
    reel: Optional[str] = None
    track_type: Optional[str] = None
    track_number: Optional[int] = None
    src_in: Optional[str] = None
    src_out: Optional[str] = None
    rec_in: Optional[str] = None
    rec_out: Optional[str] = None
    duration_frames: Optional[int] = None
    framerate: float = 24.0
    audio_tc_in: Optional[str] = None
    audio_tc_out: Optional[str] = None
    locator_name: Optional[str] = None
    locator_tc: Optional[str] = None
    comment: Optional[str] = None
    source_file: Optional[str] = None
    is_black: bool = False
    is_audio_only: bool = False
    is_temp: bool = False
    source_format: str = 'edl'
    transition: str = 'C'
    
    def to_dict(self):
        return {
            'event_num': self.event_num,
            'clip_name': self.clip_name,
            'file_name': self.file_name,
            'reel': self.reel,
            'track_type': self.track_type,
            'track_number': self.track_number,
            'src_in': self.src_in,
            'src_out': self.src_out,
            'rec_in': self.rec_in,
            'rec_out': self.rec_out,
            'duration_frames': self.duration_frames,
            'framerate': self.framerate,
            'audio_tc_in': self.audio_tc_in,
            'audio_tc_out': self.audio_tc_out,
            'locator_name': self.locator_name,
            'locator_tc': self.locator_tc,
            'comment': self.comment,
            'source_file': self.source_file,
            'is_black': self.is_black,
            'is_audio_only': self.is_audio_only,
            'is_temp': self.is_temp,
            'source_format': self.source_format,
            'transition': self.transition,
        }

