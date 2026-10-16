import base64
import os

import streamlit.components.v1 as components

_BUILD_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "frontend", "build"
)

_component_func = components.declare_component("audio_button", path=_BUILD_DIR)


def audio_button(key=None):
    """Circular voice button.

    Returns (recording_id, audio_bytes). Both are empty (None, b"") until the
    user finishes a recording. recording_id is unique per recording so the
    caller can ignore reruns that return the same recording again.
    """
    value = _component_func(key=key, default=None)
    if isinstance(value, dict) and value.get("audio"):
        return value.get("id"), base64.b64decode(value["audio"])
    return None, b""
