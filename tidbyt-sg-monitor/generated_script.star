
load("render.star", "render")
load("http.star", "http")

# Fetch the SG_DATA
SG_DATA = "24 CNVs"

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

