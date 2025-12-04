from flask import Flask, request, jsonify, send_from_directory
import avb
import os

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), '..', 'dist'))

def to_json_serializable(obj):
    if isinstance(obj, dict):
        return {k: to_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [to_json_serializable(v) for v in obj]
    elif isinstance(obj, bytes):
        return ''.join(format(x, '02x') for x in obj)
    elif isinstance(obj, bytearray):
        return ''.join(format(x, '02x') for x in obj)
    elif isinstance(obj, avb.mobid.MobID):
        return str(obj)
    elif hasattr(obj, 'property_data'):
        return to_json_serializable(obj.property_data)
    elif isinstance(obj, avb.trackgroups.Track):
        return {
            'class': obj.__class__.__name__,
            'media_kind': obj.media_kind,
            'length': obj.length,
            'index': obj.index,
            'component': to_json_serializable(obj.component),
        }
    elif hasattr(obj, 'uuid'):
        return str(obj.uuid)
    else:
        return obj

import io
import csv

@app.route("/api/avb", methods=["POST"])
def parse_avb():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    if file:
        try:
            filepath = f"/tmp/{file.filename}"
            file.save(filepath)

            output = io.StringIO()
            writer = csv.writer(output)
            
            writer.writerow(["Name", "Mob ID"])

            with avb.open(filepath) as f:
                mobs = list(f.content.mobs)
                print(f"Found {len(mobs)} mobs")
                for mob in mobs:
                    writer.writerow([mob.name, str(mob.mob_id)])

            os.remove(filepath)

            output.seek(0)
            return output.getvalue(), 200, {
                "Content-Type": "text/csv",
                "Content-Disposition": "attachment; filename=avb_export.csv"
            }

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

import subprocess
import json

@app.route("/api/mxf", methods=["POST"])
def parse_mxf():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    if file:
        try:
            filepath = f"/tmp/{file.filename}"
            file.save(filepath)

            ffprobe_path = os.getenv("FFPROBE_PATH", "ffprobe")

            ffprobe_cmd = [
                ffprobe_path,
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                filepath
            ]

            try:
                result = subprocess.run(ffprobe_cmd, capture_output=True, text=True, check=True)
            except FileNotFoundError:
                return jsonify({
                    "error": "ffprobe not found",
                    "details": "ffprobe is part of FFmpeg. Please install FFmpeg or set the FFPROBE_PATH environment variable to the absolute path of the ffprobe executable."
                }), 500
            except subprocess.CalledProcessError as e:
                return jsonify({"error": "ffprobe command failed", "details": e.stderr}), 500
            
            os.remove(filepath)

            # --- Start of new implementation ---

            # 1. Parse the ffprobe output
            raw_data = json.loads(result.stdout)

            # Helper functions for formatting
            def format_size(size_bytes):
                if not size_bytes or not str(size_bytes).isdigit():
                    return None
                size = float(size_bytes)
                if size < 1024:
                    return f"{size} B"
                elif size < 1024**2:
                    return f"{size/1024:.2f} KB"
                elif size < 1024**3:
                    return f"{size/1024**2:.2f} MB"
                else:
                    return f"{size/1024**3:.2f} GB"

            def format_bitrate(bitrate_bps):
                if not bitrate_bps or not str(bitrate_bps).isdigit():
                    return None
                bitrate = float(bitrate_bps)
                if bitrate < 1000:
                    return f"{bitrate} bps"
                elif bitrate < 1000**2:
                    return f"{bitrate/1000:.2f} kbps"
                else:
                    return f"{bitrate/1000**2:.2f} Mbps"
            
            def format_duration(duration_s):
                if not duration_s:
                    return None
                try:
                    duration = float(duration_s)
                    return f"{duration:.2f} s"
                except (ValueError, TypeError):
                    return None


            # 2. Create the structured summary
            output = {}
            
            # 3. Top-level summary
            format_info = raw_data.get('format', {})
            output['summary'] = {
                'File Name': format_info.get('filename'),
                'Format': format_info.get('format_long_name'),
                'Duration': format_duration(format_info.get('duration')),
                'Size': format_size(format_info.get('size')),
                'Overall Bit Rate': format_bitrate(format_info.get('bit_rate')),
                'Stream Count': format_info.get('nb_streams')
            }

            # 4. Group streams
            output['video_streams'] = []
            output['audio_streams'] = []
            output['other_streams'] = []

            for stream in raw_data.get('streams', []):
                stream_type = stream.get('codec_type')
                
                if stream_type == 'video':
                    info = {
                        'Stream Index': stream.get('index'),
                        'Codec': stream.get('codec_long_name'),
                        'Resolution': f"{stream.get('width')}x{stream.get('height')}",
                        'Aspect Ratio': stream.get('display_aspect_ratio'),
                        'Frame Rate': stream.get('avg_frame_rate'),
                        'Bit Rate': format_bitrate(stream.get('bit_rate')),
                        'Pixel Format': stream.get('pix_fmt'),
                        'details': stream # include all original stream data
                    }
                    output['video_streams'].append(info)
                
                elif stream_type == 'audio':
                    info = {
                        'Stream Index': stream.get('index'),
                        'Codec': stream.get('codec_long_name'),
                        'Sample Rate': stream.get('sample_rate'),
                        'Channels': f"{stream.get('channels')} ({stream.get('channel_layout')})",
                        'Bit Rate': format_bitrate(stream.get('bit_rate')),
                        'details': stream # include all original stream data
                    }
                    output['audio_streams'].append(info)
                
                else:
                    info = {
                        'Stream Index': stream.get('index'),
                        'Codec': stream.get('codec_long_name'),
                        'Type': stream_type,
                        'details': stream # include all original stream data
                    }
                    output['other_streams'].append(info)

            # 5. Include the full raw data at the end
            output['raw_data'] = raw_data

            # 6. Return the comprehensive summary
            return jsonify(output)

            # --- End of new implementation ---

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == "__main__":
    app.run(debug=True, port=5001)
