#!/usr/bin/env bash
#
# Bump the wasavi extension version across the source manifest, package
# metadata, and the dist update manifests, then commit the result.
#
#   usage: ./bump-version.sh <version>     set an explicit X.Y.Z version
#          ./bump-version.sh --increment   bump the revision (patch) by one
#
# Only release-version fields are touched. The '0.0.1' dev/test sentinel used by
# isDev / TEST_VERSION (in the backend sources) is intentionally left alone.

set -euo pipefail

usage() {
	echo "usage: $0 <version>|--increment" >&2
	exit 2
}

[ "$#" -eq 1 ] || usage

# run relative to the repository root (this script lives at the repo root)
root="$(cd "$(dirname "$0")" && pwd)"
cd "$root"

manifest=src/chrome/manifest.json

read_version() {
	# first "version" field of the manifest (its add-on version)
	perl -ne 'if (/"version":\s*"([^"]*)"/) { print $1; exit }' "$manifest"
}

case "$1" in
--increment)
	current="$(read_version)"
	if ! printf '%s' "$current" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
		echo "error: cannot parse current version from $manifest (got '$current')" >&2
		exit 1
	fi
	major="${current%%.*}"
	rest="${current#*.}"
	minor="${rest%%.*}"
	patch="${rest#*.}"
	version="${major}.${minor}.$((patch + 1))"
	;;
*)
	version="$1"
	if ! printf '%s' "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
		echo "error: version must look like X.Y.Z (got '$version')" >&2
		exit 2
	fi
	;;
esac

# JSON "version" fields. The leading quote in the pattern keeps it from matching
# keys such as "strict_min_version".
json_files=("$manifest" package.json dist/firefox.json)
# Chrome / Opera update manifests: the version is an attribute on <updatecheck>.
gupdate_files=(dist/chrome.xml dist/opera-blink.xml)
# Firefox RDF update manifest: <em:version> element.
rdf_file=dist/firefox.rdf

for f in "${json_files[@]}"; do
	perl -i -pe 's/"version":\s*"[^"]*"/"version": "'"$version"'"/' "$f"
done

# anchored on <updatecheck> so the <?xml version="1.0"?> declaration is untouched
for f in "${gupdate_files[@]}"; do
	perl -i -pe 's/(<updatecheck\b[^>]*\bversion=")[^"]*/${1}'"$version"'/' "$f"
done

perl -i -pe 's{<em:version>[^<]*</em:version>}{<em:version>'"$version"'</em:version>}' "$rdf_file"

echo "bumped version to $version"

# stage and commit only the files this script edits
git add "${json_files[@]}" "${gupdate_files[@]}" "$rdf_file"
if git diff --cached --quiet; then
	echo "no version changes to commit"
	exit 0
fi
git commit -m "bump version to $version"
