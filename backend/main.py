from flask import Flask, request, jsonify, send_from_directory, send_file
import avb
import os
import pycmx
import pandas as pd
from werkzeug.utils import secure_filename
import ALE_Parser
import io
import csv
import subprocess
import json


app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), '..', 'dist'))

def convert_cr_to_lf(filepath):
    """Converts CR-only line endings to LF."""
    try:
        with open(filepath, 'rb') as f:
            content = f.read()
        
        # Check for files with CR but no LF, and convert them
        if b'\r' in content and b'\n' not in content:
            content = content.replace(b'\r', b'\n')
            with open(filepath, 'wb') as f:
                f.write(content)
    except Exception as e:
        print(f"Error converting line endings for {filepath}: {e}")

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

            with avb.open(filepath) as f:
                raw_data = to_json_serializable(f.content)
                
                summary = {
                    'File Name': file.filename,
                    'Mob Count': len(raw_data.get('mobs', [])),
                }

                mobs_summary = []
                for mob in raw_data.get('mobs', []):
                    mobs_summary.append({
                        'Name': mob.get('name'),
                        'Mob ID': mob.get('mob_id'),
                        'details': mob
                    })

                output = {
                    "summary": summary,
                    "mobs": mobs_summary,
                    "raw_data": raw_data,
                }
                
                return jsonify(output)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500
        finally:
            if 'filepath' in locals() and os.path.exists(filepath):
                os.remove(filepath)

@app.route("/api/avb/csv", methods=["POST"])
def parse_avb_csv():
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
                for mob in mobs:
                    writer.writerow([mob.name, str(mob.mob_id)])

            os.remove(filepath)

            output.seek(0)
            return output.getvalue(), 200, {
                "Content-Type": "text/csv",
                "Content-Disposition": f"attachment; filename={os.path.splitext(file.filename)[0]}.csv"
            }

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

@app.route("/api/edl", methods=["POST"])
def parse_edl():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    if file:
        try:
            # Read content directly from the file stream
            file_content = file.stream.read().decode("utf-8")
            
            edl = pycmx.parse_cmx3600(file_content)

            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write header
            writer.writerow(["Event", "Reel", "Track", "Trn", "Src TC In", "Src TC Out", "Rec TC In", "Rec TC Out", "Clip Name"])

            # Write events
            for event in edl.events:
                clip_name = None
                if event.comments:
                    for comment in event.comments:
                        if comment.startswith("* FROM CLIP NAME:"):
                            clip_name = comment.split(":", 1)[1].strip()
                
                writer.writerow([
                    event.number,
                    event.source,
                    event.track,
                    event.transition.kind if event.transition else "C",
                    event.source_start,
                    event.source_end,
                    event.record_start,
                    event.record_end,
                    clip_name,
                ])

            output.seek(0)
            return output.getvalue(), 200, {
                "Content-Type": "text/csv",
                "Content-Disposition": "attachment; filename=edl_export.csv"
            }

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

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

            # Try to find ffprobe - works for both Mac dev and Linux containers
            ffprobe_path = os.getenv("FFPROBE_PATH")
            if not ffprobe_path:
                # Try common paths
                import shutil
                ffprobe_path = shutil.which("ffprobe")
                if not ffprobe_path:
                    # Fallback to Mac homebrew path for local development
                    ffprobe_path = "/opt/homebrew/bin/ffprobe" if os.path.exists("/opt/homebrew/bin/ffprobe") else "ffprobe"

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

            def format_aspect_ratio(aspect_str):
                """Convert aspect ratio from '256:135' format to '1.896:1' format"""
                if not aspect_str or aspect_str == 'N/A':
                    return None
                try:
                    if ':' in aspect_str:
                        parts = aspect_str.split(':')
                        width = float(parts[0])
                        height = float(parts[1])
                        if height > 0:
                            ratio = width / height
                            return f"{ratio:.3f}:1"
                    return aspect_str
                except (ValueError, IndexError, ZeroDivisionError):
                    return aspect_str


            # 2. Create the structured summary
            output = {}

            # 3. Top-level summary
            format_info = raw_data.get('format', {})
            tags = format_info.get('tags', {})
            output['summary'] = {
                'File Name': os.path.basename(format_info.get('filename')),
                'Format': format_info.get('format_long_name'),
                'Duration': format_duration(format_info.get('duration')),
                'File Size': format_size(format_info.get('size')),
                'Overall Bit Rate': format_bitrate(format_info.get('bit_rate')),
                'Stream Count': format_info.get('nb_streams'),
                'company_name': tags.get('company_name'),
                'product_name': tags.get('product_name'),
                'product_version': tags.get('product_version'),
                'product_uid': tags.get('uid'),
                'project_name': tags.get('project_name'),
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
                        'Aspect Ratio': format_aspect_ratio(stream.get('display_aspect_ratio')),
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

@app.route("/api/ale", methods=["POST"])
def parse_ale():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    filename = file.filename
    if filename == "":
        return jsonify({"error": "No selected file"}), 400

    check_tape_length = request.form.get("check_tape_length", "true").lower() == "true"

    try:
        if filename.lower().endswith('.ale'):
            filepath = f"/tmp/{filename}"
            file.save(filepath)
            convert_cr_to_lf(filepath)
            parsed_data = ALE_Parser.ale_read_parser(filepath, check_tape_length=check_tape_length)
            if parsed_data[2] is None:
                return jsonify({"error": "Invalid ALE file."} ), 400
            _, _, df, _, _ = parsed_data
            os.remove(filepath)
            
            output = io.StringIO()
            df.to_csv(output, index=False)
            output.seek(0)
            
            new_filename = f"{os.path.splitext(filename)[0]}.csv"
            return output.getvalue(), 200, {
                "Content-Type": "text/csv",
                "Content-Disposition": f"attachment; filename={new_filename}"
            }
        
        else:
            return jsonify({"error": "Invalid file type. Please upload an .ale file."} ), 400

    except ValueError as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route("/api/ale/multi_to_csvs", methods=["POST"])
def convert_ales_to_csvs():
    if "files" not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    files = request.files.getlist("files")

    if not files or all(f.filename == "" for f in files):
        return jsonify({"error": "No selected files"}), 400

    check_tape_length = request.form.get("check_tape_length", "true").lower() == "true"
    csv_files = []
    for file in files:
        if file and file.filename.lower().endswith('.ale'):
            filename = secure_filename(file.filename)
            try:
                filepath = f"/tmp/{filename}"
                file.save(filepath)
                convert_cr_to_lf(filepath)
                
                parsed_data = ALE_Parser.ale_read_parser(filepath, check_tape_length=check_tape_length)
                if parsed_data[2] is None:
                    print(f"Skipping file {filename} due to parsing error.")
                    continue
                
                _, _, df, _, _ = parsed_data
                os.remove(filepath)
                
                output = io.StringIO()
                df.to_csv(output, index=False)
                output.seek(0)
                
                csv_filename = f"{os.path.splitext(filename)[0]}.csv"
                csv_files.append({
                    "filename": csv_filename,
                    "content": output.getvalue()
                })

            except ValueError as e:
                print(f"Error processing file {filename}: {e}")
                continue
            except Exception as e:
                print(f"Error processing file {filename}: {e}")
                continue
    
    if not csv_files:
        return jsonify({"error": "No valid ALE files to process"}), 400

    return jsonify(csv_files)

@app.route("/api/ale/merge_to_csv", methods=["POST"])
def merge_ales_to_csv():
    if "files" not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    files = request.files.getlist("files")

    if not files or all(f.filename == "" for f in files):
        return jsonify({"error": "No selected files"}), 400

    check_tape_length = request.form.get("check_tape_length", "true").lower() == "true"
    all_dfs = []
    for file in files:
        if file and file.filename.lower().endswith('.ale'):
            filename = secure_filename(file.filename)
            try:
                filepath = f"/tmp/{filename}"
                file.save(filepath)
                convert_cr_to_lf(filepath)
                parsed_data = ALE_Parser.ale_read_parser(filepath, check_tape_length=check_tape_length)
                if parsed_data[2] is None:
                    print(f"Skipping file {filename} due to parsing error.")
                    continue
                _, _, df, _, _ = parsed_data
                os.remove(filepath)
                all_dfs.append(df)

            except ValueError as e:
                print(f"Error processing file {filename}: {e}")
                continue
            except Exception as e:
                print(f"Error processing file {filename}: {e}")
                continue
    
    if not all_dfs:
        return jsonify({"error": "No valid ALE files to merge"}), 400

    merged_df = pd.concat(all_dfs, ignore_index=True)
    
    output = io.StringIO()
    merged_df.to_csv(output, index=False)
    output.seek(0)
    
    return output.getvalue(), 200, {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=merged_ales.csv"
    }

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == "__main__":
    app.run(debug=True, port=5001)
