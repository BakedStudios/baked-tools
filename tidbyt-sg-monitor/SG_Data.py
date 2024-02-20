#!/Library/Frameworks/Python.framework/Versions/3.11/bin/python3

import shotgun_api3
import os
import subprocess

# Define your ShotGrid server and script credentials
SHOTGUN_URL = 'https://baked.shotgunstudio.com'
SCRIPT_NAME = 'Tidbyt'
SCRIPT_KEY = 'vtwnfanavajaer^tjeclzO8ek'

# Connect to ShotGrid
sg = shotgun_api3.Shotgun(SHOTGUN_URL, SCRIPT_NAME, SCRIPT_KEY)

# Find Versions with status
filters = [['sg_status_list', 'is', "cnv"], ['project.Project.sg_status', 'is', 'Active']]
result = sg.find('Version', filters)

count_of_records = len(result)

print(count_of_records)

# Set MESSAGE variable
MESSAGE = str(count_of_records) + " CNVs"

STARLARK_TEMPLATE = """
load("render.star", "render")
load("http.star", "http")

# Fetch the SG_DATA
SG_DATA = "{}"

# Load SG icon
SG_ICON = http.get('https://i.redd.it/33ncocix7k1c1.png').body()

def main():
    return render.Root(
        child = render.Box( # This Box exists to provide vertical centering
            render.Row(
                expanded=True, # Use as much horizontal space as possible
                main_align="space_evenly", # Controls horizontal alignment
                cross_align="center", # Controls vertical alignment
                children = [
                    render.Image(
                        src = SG_ICON,
                        width = 20,
                        height = 20,
                    ),
                    render.Text(SG_DATA),
                ],
        )
    )
    )

"""

# Embed the MESSAGE in the Starlark template
starlark_code = STARLARK_TEMPLATE.format(MESSAGE)

# Write the Starlark code to a .star file
with open('/Applications/Tidbyt/generated_script.star', 'w') as file:
    file.write(starlark_code)

# Define a function to run terminal commands in a specified directory
def run_command_in_directory(command, directory):
    try:
        # Use subprocess to execute the command
        # cwd sets the current working directory
        result = subprocess.run(command, cwd=directory, shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(result.stdout.decode())  # Print command output
        return result
    except subprocess.CalledProcessError as e:
        print(f"Command '{command}' failed with error:\n{e.stderr.decode()}")
        return None

# Navigate to the required directory and run the commands
tidbyt_directory = os.path.expanduser("/Applications/Tidbyt")  # Adjust path if necessary

run_command_in_directory("/usr/local/bin/pixlet render generated_script.star", tidbyt_directory)
run_command_in_directory("/usr/local/bin/pixlet push benignly-hopeful-righteous-capuchin-afd generated_script.webp", tidbyt_directory)
