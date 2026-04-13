import re
from typing import List
from models.event import Event

def frames_to_tc(frames: int, fps: float) -> str:
    round_fps = round(fps)
    h = int(frames / (3600 * round_fps))
    m = int((frames % (3600 * round_fps)) / (60 * round_fps))
    s = int(((frames % (3600 * round_fps)) % (60 * round_fps)) / round_fps)
    f = int(((frames % (3600 * round_fps)) % (60 * round_fps)) % round_fps)
    return f"{h:02d}:{m:02d}:{s:02d}:{f:02d}"

def tc_to_frames(tc: str, fps: float) -> int:
    if not tc:
        return 0
    parts = [int(p) for p in re.split('[:;]', tc)]
    if len(parts) != 4:
        return 0
    round_fps = round(fps)
    return (parts[0] * 3600 * round_fps +
            parts[1] * 60 * round_fps +
            parts[2] * round_fps +
            parts[3])

def detect_framerate(text: str) -> float:
    if 'FCM: DROP FRAME' in text:
        return 29.97
    if 'FCM: NON-DROP FRAME' in text:
        return 30.0

    tc_regex = r'(\d{2}:\d{2}:\d{2}:\d{2})'
    matches = re.findall(tc_regex, text)
    if not matches:
        return 24.0

    max_frame = 0
    for match in matches:
        frame = int(match[-2:])
        if frame > max_frame:
            max_frame = frame

    if max_frame > 50: return 60.0
    if max_frame > 40: return 50.0
    if max_frame > 25: return 29.97
    if max_frame > 24: return 25.0
    return 24.0

def parse(text: str, filename: str = None) -> List[Event]:
    lines = text.split('
')
    clips: List[Event] = []
    current_clip_dict = {}
    
    fps = detect_framerate(text)

    # Regex patterns translated from JS
    event_regex = re.compile(r'^(\d+)\s+(\S+)\s+(\S+)\s+(\S+)(?:.*?)\s+(\d{2}:\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2}:\d{2})')
    name_regex = re.compile(r'\*\s*FROM CLIP NAME:\s*(.*)')
    to_name_regex = re.compile(r'\*\s*TO CLIP NAME:\s*(.*)')
    source_file_regex = re.compile(r'\*\s*SOURCE FILE:\s*(.*)')
    
    for line in lines:
        event_match = event_regex.match(line.strip())
        if event_match:
            # If a clip was being processed, finalize and add it
            if current_clip_dict:
                clips.append(Event(**current_clip_dict))

            groups = event_match.groups()
            src_in_tc = groups[4]
            src_out_tc = groups[5]
            
            src_in_frames = tc_to_frames(src_in_tc, fps)
            src_out_frames = tc_to_frames(src_out_tc, fps)

            current_clip_dict = {
                'event_num': int(groups[0]),
                'reel': groups[1],
                'track_type': groups[2],
                'transition': groups[3],
                'src_in': src_in_tc,
                'src_out': src_out_tc,
                'rec_in': groups[6],
                'rec_out': groups[7],
                'duration_frames': src_out_frames - src_in_frames,
                'framerate': fps,
                'source_format': 'edl',
                'is_black': groups[1] == 'BL' or groups[1] == 'BLK',
            }

        elif current_clip_dict:
            name_match = name_regex.match(line.strip())
            if name_match:
                clip_name = name_match.group(1).strip()
                current_clip_dict['clip_name'] = clip_name
                if 'source_file' not in current_clip_dict or not current_clip_dict['source_file']:
                    current_clip_dict['source_file'] = clip_name
            
            to_name_match = to_name_regex.match(line.strip())
            if to_name_match:
                clip_name = to_name_match.group(1).strip()
                current_clip_dict['clip_name'] = clip_name
                if 'source_file' not in current_clip_dict or not current_clip_dict['source_file']:
                    current_clip_dict['source_file'] = clip_name

            source_match = source_file_regex.match(line.strip())
            if source_match:
                current_clip_dict['source_file'] = source_match.group(1).strip()

    # Add the last clip
    if current_clip_dict:
        clips.append(Event(**current_clip_dict))
        
    return clips
