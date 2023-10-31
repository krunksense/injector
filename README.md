# KRUNKSENSE INJECTOR

You are probably looking for the download, click [here](//github.com/z3db0y/krunksense_injector/releases/latest).

## How to inject

- Click `Add Client`
    - Windows:
    Find the client folder. It should contain the client `exe` and a `resources`` folder.
    - Linux:
    Find the `AppImage` or the client folder (will have a `resources` folder inside).
    - MacOS:
    Select the `.App`.
- Click the play icon next to the client name in the list.

## Passing inspections (competitive)

- Clear your `TEMP` folder.
- Rename the injector executable to something random.

(Windows only)
- Clear file rename/delete logs using cmd (admin) `fsutil usn deletejournal /D C:`. Replace `C:` with the name of your drive if needed.
- If really schizo, delete `%APPDATA%\vn0a7945g7q894`.