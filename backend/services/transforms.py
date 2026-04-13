from typing import List
from models.event import Event

def apply_transforms(events: List[Event], options: dict) -> List[Event]:
    """
    Applies transformations to a list of events based on the provided options.
    """
    locator_to_clip_name = options.get('locatorToClipName', False)
    file_name_to_tape_name = options.get('fileNameToTapeName', False)
    
    for event in events:
        if locator_to_clip_name:
            if event.locator_name:
                event.clip_name = event.locator_name
        
        if file_name_to_tape_name:
            if getattr(event, 'source_file', None):
                event.reel = event.source_file
                
    return events
