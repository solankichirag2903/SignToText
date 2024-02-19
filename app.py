# Import necessary modules
from flask import Flask, render_template, Response, url_for
import cv2
from cvzone.HandTrackingModule import HandDetector
from cvzone.ClassificationModule import Classifier
import numpy as np
import math
import time

app = Flask(__name__)

# Initialize gesture recognition variables
detector = HandDetector(maxHands=2, detectionCon=0.7)
classifier = Classifier("model/keras_model.h5", "model/labels.txt")
offset = 20
imgSize = 300
labels = ["A", "B", "C"]

# Text variable to accumulate recognized characters to form a message
text_message = ""

# ----------------------------------------------

last_update_time = time.time()

def gesture_recognition(img):
    global text_message, last_update_time

    hands, img = detector.findHands(img)

    for hand in hands:
        current_time = time.time()
        # Add a delay of 0.5 seconds between character additions
        if current_time - last_update_time >= 0.5:  # Reduce delay for smoother updates
            x, y, w, h = hand['bbox']
            imgWhite = np.ones((imgSize, imgSize, 3), np.uint8) * 255
            imgCrop = img[y - offset:y + h + offset, x - offset:x + w + offset]
            aspectRatio = h / w

            if aspectRatio > 1:
                k = imgSize / h
                wCal = math.ceil(k * w)
                imgResize = cv2.resize(imgCrop, (wCal, imgSize))
                imgWhite[:, :wCal] = imgResize
            else:
                k = imgSize / w
                hCal = math.ceil(k * h)
                imgResize = cv2.resize(imgCrop, (imgSize, hCal))
                imgWhite[:hCal, :] = imgResize
    prediction, index = classifier.getPrediction(imgWhite, draw=False)
    if index is not None:
                text_message = labels[index]  # Show only the recognized character
                last_update_time = current_time  # Update the last update time

    return img

def wrap_text(text, width):
    lines = []
    current_line = ""
    for word in text.split():
        if cv2.getTextSize(current_line + word, cv2.FONT_HERSHEY_SIMPLEX, 1, 2)[0][0] <= width:
            current_line += word + " "
        else:
            lines.append(current_line.strip())
            current_line = word + " "
    lines.append(current_line.strip())
    return lines

def generate_frames():
    cap = cv2.VideoCapture(0)
    
    # Set lower video frame width and height for performance
    cap.set(3, 640)  # Width
    cap.set(4, 480)  # Height

    while True:
        success, frame = cap.read()
        if not success:
            continue

        try:
            img = gesture_recognition(frame)
        except Exception as e:
            print(f"Error in gesture_recognition: {e}")
            continue

        ret, buffer = cv2.imencode('.jpg', img)
        frame = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

        # Display the accumulated text message on the screen
        message_lines = wrap_text(f"Text Message: {text_message}", 600)
        for i, line in enumerate(message_lines):
            cv2.putText(img, line, (10, 30 + i * 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

        cv2.imshow("Image", img)

        # Break the loop when the 'q' key is pressed
        if cv2.waitKey(1) == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()

# ------------------------------------------

@app.route('/')
def index():
    return render_template('index.html', video_feed_url=url_for('video_feed'))

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(debug=True)
