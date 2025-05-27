# --- ADD: Script to run Tkinter folder selection dialog in a separate process ---
import tkinter as tk
from tkinter import filedialog
import sys
import os
import traceback # Import traceback for detailed error logging (print to stderr)

def run_dialog():
    """
    Runs the Tkinter folder selection dialog.
    Initial directory can be passed as the first command-line argument.
    Prints the selected path to stdout upon successful selection.
    Prints an empty string to stdout if cancelled or if an error occurs.
    Exits with status 0 on success/cancel, non-zero on error.
    """
    root = None

    # --- FIX: Explicitly set stdout/stderr encoding to UTF-8 ---
    # This ensures the child process outputs in a predictable encoding regardless of system locale.
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    # --- END FIX ---


    try:
        # Create a root Tkinter window, but keep it hidden.
        # This is necessary for filedialog to work on some systems.
        root = tk.Tk()
        root.withdraw() # Hide the main window

        # Get initial directory from command line arguments if provided
        initial_dir = None
        # sys.argv[1] should be the initial directory string if passed
        if len(sys.argv) > 1:
             arg_path = sys.argv[1]
             # Validate if the provided argument is a valid directory
             if os.path.isdir(arg_path):
                 initial_dir = arg_path
             else:
                 # If provided an argument but it's not a valid directory, warn and ignore
                 print(f"Warn: Initial directory argument is not a valid directory: {arg_path}", file=sys.stderr)
                 # Initial dir remains None

        # Open the folder selection dialog
        folder_path = filedialog.askdirectory(
             initialdir=initial_dir,
             title="选择文件夹" # Generic title
        )

        # filedialog.askdirectory returns a path string or an empty string "" on cancel.
        # Print the result to standard output.
        # An empty string indicates cancellation or potentially some failure where no path was selected.
        # We'll treat empty string received by the parent process as cancellation.
        print(folder_path) # Print selected path (or empty string for cancel)

        sys.exit(0) # Exit successfully (0 status)

    except Exception as e:
        # Catch any unexpected errors during the dialog process.
        # Print error details to stderr for debugging in the parent process logs.
        print(f"Error in folder dialog script: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr) # Print traceback to stderr
        print("") # Print an empty string to stdout to signal failure/no path selected
        sys.exit(1) # Exit with a non-zero status code to indicate an error

    finally:
        # Destroy the Tkinter root window if it was created.
        if root is not None:
            try:
                root.destroy()
            except tk.TclError:
                 # Handle cases where root might already be destroyed or invalid
                 pass # Fail silently on redundant destroy attempt
            except Exception as destroy_e:
                 # Catch any other errors during destruction
                 print(f"Error destroying Tkinter root: {destroy_e}", file=sys.stderr)

if __name__ == "__main__":
    run_dialog()
# --- END ADD ---