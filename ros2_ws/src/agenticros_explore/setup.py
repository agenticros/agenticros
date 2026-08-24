from glob import glob

from setuptools import setup

package_name = "agenticros_explore"

setup(
    name=package_name,
    version="0.0.1",
    packages=[package_name],
    data_files=[
        ("share/ament_index/resource_index/packages", ["resource/" + package_name]),
        ("share/" + package_name, ["package.xml"]),
        ("share/" + package_name + "/launch", glob("launch/*.py")),
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="PlaiPin",
    maintainer_email="team@plaipin.com",
    description="Frontier exploration and wander actions for AgenticROS (Nav2 NavigateToPose client)",
    license="Apache-2.0",
    tests_require=["pytest"],
    entry_points={
        "console_scripts": [
            "explore_node = agenticros_explore.explore_node:main",
        ],
    },
)
