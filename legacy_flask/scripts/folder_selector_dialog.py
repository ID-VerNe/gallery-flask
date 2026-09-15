import tkinter as tk
from tkinter import filedialog
import sys
import os
import traceback

def run_dialog():
    root = None

    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

    try:
        root = tk.Tk()
        root.withdraw()

        initial_dir = None
        if len(sys.argv) > 1:
             arg_path = sys.argv[1]
             if os.path.isdir(arg_path):
                 initial_dir = arg_path
             else:
                 print(f"Warn: Initial directory argument is not a valid directory: {arg_path}", file=sys.stderr)

        folder_path = filedialog.askdirectory(
             initialdir=initial_dir,
             title="选择文件夹"
        )

        print(folder_path)

        sys.exit(0)

    except Exception as e:
        print(f"Error in folder dialog script: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        print("")
        sys.exit(1)

    finally:
        if root is not None:
            try:
                root.destroy()
            except tk.TclError:
                 pass
            except Exception as destroy_e:
                 print(f"Error destroying Tkinter root: {destroy_e}", file=sys.stderr)

if __name__ == "__main__":
    run_dialog()
