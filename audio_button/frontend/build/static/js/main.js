// Import Streamlit component API
// In Streamlit components, Streamlit is available as a global

const button = document.getElementById('audioButton');
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let analyser = null;
let dataArray = null;
let animationFrameId = null;

// Initialize Streamlit communication
function initStreamlit() {
  // Streamlit should be available as a global in the component iframe
  if (window.Streamlit) {
    // Component is ready
    window.Streamlit.setComponentValue('');
    window.Streamlit.setFrameHeight(100);
  }
}

// Request microphone and set up audio processing
async function setupAudio() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();
      // Convert to base64 for sending back
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Reset for next recording
      audioChunks = [];

      // Send audio data back to Streamlit
      if (window.Streamlit) {
        window.Streamlit.setComponentValue(base64Audio);
      }

      // Clean up
      stream.getTracks().forEach(track => track.stop());
    };

    return true;
  } catch (err) {
    console.error('Error accessing microphone:', err);
    return false;
  }
}

// Visualize audio levels for speaking feedback
function visualize() {
  if (!analyser) return;

  analyser.getByteFrequencyData(dataArray);

  // Calculate RMS (root mean square) for volume level
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i] * dataArray[i];
  }
  const rms = Math.sqrt(sum / dataArray.length);
  const volume = rms / 255; // Normalize to 0-1

  // Update button state based on volume
  if (volume > 0.1) { // Speaking threshold
    button.classList.add('speaking');
    button.classList.remove('recording');
  } else {
    button.classList.remove('speaking');
    button.classList.add('recording');
  }

  animationFrameId = requestAnimationFrame(visualize);
}

// Handle button click
button.addEventListener('click', async () => {
  if (!isRecording) {
    // Start recording
    const setupSuccess = await setupAudio();
    if (!setupSuccess) {
      alert('Could not access microphone. Please check permissions.');
      return;
    }

    try {
      mediaRecorder.start();
      isRecording = true;
      button.classList.add('recording');
      button.classList.remove('speaking');

      // Start visualization
      visualize();

      // Update ARIA label
      button.setAttribute('aria-label', 'Release to stop speaking');
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Failed to start recording');
    }
  } else {
    // Stop recording
    isRecording = false;
    mediaRecorder.stop();
    button.classList.remove('recording', 'speaking');

    // Stop visualization
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    // Update ARIA label
    button.setAttribute('aria-label', 'Tap to speak');
  }
});

// Initialize
initStreamlit();