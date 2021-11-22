#!/bin/bash -x
#
# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./build-open-source-dist.sh solution-name
#
# Paramenters:
#  - solution-name: name of the solution for consistency

# Check to see if input has been provided:
if [ -z "$1" ]; then
    echo "Please provide the trademark approved solution name for the open source package."
    echo "For example: ./build-open-source-dist.sh trademarked-solution-name"
    exit 1
fi

SOLUTION_NAME=$1
deployment_dir="$PWD" # This script is run after build-s3-dist.sh, inside of deployment/
dist_dir="$deployment_dir/open-source"
dist_template_dir="$dist_dir/deployment"
template_location="$deployment_dir/global-s3-assets/$SOLUTION_NAME.template" # After build-s3-dist.sh is run, the template is here
source_dir="$deployment_dir/../source"
github_dir="$source_dir/.github"

echo "------------------------------------------------------------------------------"
echo "[Init] Clean old open-source folder"
echo "------------------------------------------------------------------------------"
rm -rf $dist_dir
mkdir -p $dist_dir
mkdir -p $dist_template_dir

echo "------------------------------------------------------------------------------"
echo "[Packing] Build Script"
echo "------------------------------------------------------------------------------"
cp $deployment_dir/build-s3-dist.sh $dist_template_dir

echo "------------------------------------------------------------------------------"
echo "[Packing] Solution Template"
echo "------------------------------------------------------------------------------"
cp $template_location $dist_template_dir

echo "------------------------------------------------------------------------------"
echo "[Packing] GitHub templates"
echo "------------------------------------------------------------------------------"
cp -r $github_dir $dist_dir

echo "------------------------------------------------------------------------------"
echo "[Packing] Files from the root level of the project"
echo "------------------------------------------------------------------------------"
cp $deployment_dir/../LICENSE.txt $dist_dir
cp $source_dir/THIRD-PARTY $dist_dir/NOTICE.txt
cp $deployment_dir/../README.md $dist_dir
cp $deployment_dir/../CODE_OF_CONDUCT.md $dist_dir
cp $deployment_dir/../CONTRIBUTING.md $dist_dir
cp $deployment_dir/../CHANGELOG.md $dist_dir
cp -r $deployment_dir/../.gitignore $dist_dir

echo "------------------------------------------------------------------------------"
echo "[Packing] Source Folder"
echo "------------------------------------------------------------------------------"
# Remove duplicate files first
rm $source_dir/CHANGELOG.md
rm $source_dir/CODE_OF_CONDUCT.md
rm $source_dir/CONTRIBUTING.md
rm $source_dir/LICENSE
rm $source_dir/NOTICE
rm $source_dir/README.md
rm -rf $github_dir
cp -r $source_dir $dist_dir

echo "------------------------------------------------------------------------------"
echo "[Packing] Clean dist, node_modules and bower_components folders"
echo "------------------------------------------------------------------------------"
find $dist_dir -iname "node_modules" -type d -exec rm -r "{}" \; 2> /dev/null
find $dist_dir -iname "tests" -type d -exec rm -r "{}" \; 2> /dev/null
find $dist_dir -iname "dist" -type d -exec rm -r "{}" \; 2> /dev/null
find $dist_dir -iname "bower_components" -type d -exec rm -r "{}" \; 2> /dev/null
find $dist_dir -type f -name 'package-lock.json' -delete

echo "------------------------------------------------------------------------------"
echo "[Packing] Create GitHub (open-source) zip file"
echo "------------------------------------------------------------------------------"
# Create the zip file
cd $dist_dir
zip -q -r9 ../$1.zip .

# Cleanup any temporary/unnecessary files
echo "Clean up open-source folder"
rm -rf * .*

# Place final zip file in $dist_dir
mv ../$1.zip .
echo "Completed building $1.zip dist"