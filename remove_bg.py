import sys
from PIL import Image

def remove_background(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    # Get top-left corner color as the background color
    bg_color = data[0]
    threshold = 30
    
    new_data = []
    for item in data:
        # Check distance to background color
        if abs(item[0] - bg_color[0]) < threshold and \
           abs(item[1] - bg_color[1]) < threshold and \
           abs(item[2] - bg_color[2]) < threshold:
            new_data.append((item[0], item[1], item[2], 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    remove_background(sys.argv[1], sys.argv[2])
