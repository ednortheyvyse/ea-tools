from typing import List
from models.event import Event

def apply_filters(events: List[Event], options: dict) -> List[Event]:
    """
    Applies filtering to a list of events based on the provided options.
    """
    filtered = []
    
    ignore_audio = options.get('ignoreAudio', False)
    ignore_missing_reel = options.get('ignoreMissingReel', False)
    ignore_missing_name = options.get('ignoreMissingName', False)
    ignore_black = options.get('ignoreBlack', False)
    ignore_avid_temp = options.get('ignoreAvidTemp', False)

    for event in events:
        if ignore_audio:
            if event.track_type and 'A' in event.track_type and 'V' not in event.track_type:
                continue
                
        if ignore_missing_reel:
            if event.reel in ('', 'AX', None):
                continue
                
        if ignore_missing_name:
            if not event.clip_name:
                continue
                
        if ignore_black:
            if event.reel in ('BL', 'BLK'):
                continue
                
        if ignore_avid_temp:
            clip_name = event.clip_name or ''
            source_file = getattr(event, 'source_file', '') or ''
            if '.NEW.' in clip_name or '.NEW.' in source_file:
                continue
                
        filtered.append(event)
        
    return filtered
