from glob import glob

from setuptools import find_packages, setup

package_name = "agenticros_bringup"

setup(
    name=package_name,
    version="0.0.1",
    packages=find_packages(exclude=["test"]),
    data_files=[
        ("share/ament_index/resource_index/packages", ["resource/" + package_name]),
        ("share/" + package_name, ["package.xml"]),
        ("share/" + package_name + "/launch", glob("launch/*.py")),
        ("share/" + package_name + "/rviz", glob("rviz/*.rviz")),
    ],
    install_requires=["setuptools"],
    entry_points={
        "console_scripts": [
            "cmd_vel_relay = agenticros_bringup.cmd_vel_relay:main",
        ],
    },
    zip_safe=True,
    maintainer="PlaiPin",
    maintainer_email="team@plaipin.com",
    description="AgenticROS-friendly simulation and RViz bringup.",
    license="Apache-2.0",
)
