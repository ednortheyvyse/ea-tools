from typing import List
from models.event import Event

def apply_sorters(events: List[Event], options: dict) -> List[Event]:
    """
    Applies sorting to a list of events based on the provided options.
    """
    sort_option = options.get('sort', 'original')
    
    if sort_option == 'clip_name':
        events.sort(key=lambda e: (e.clip_name or '').lower())
    elif sort_option == 'reel_tc':
        events.sort(key=lambda e: ((e.reel or '').lower(), e.src_in or ''))
    
    return events
