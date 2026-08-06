init readme

mkdir -p output
          cp -r src/assets output/
          html-minifier-terser --collapse-whitespace --remove-comments --minify-js true --minify-css true -o output/index.html src/index.html
          html-minifier-terser --collapse-whitespace --remove-comments --minify-js true --minify-css true -o output/mdb.html src/mdb.html
          html-minifier-terser --collapse-whitespace --remove-comments --minify-js true --minify-css true -o output/blog.html src/blog.html
          cleancss -o output/styles.css src/styles.css
          terser src/script.js --compress --mangle -o output/script.js
          terser src/features.js --compress --mangle -o output/features.js
          cp src/footer.js output/ 2>/dev/null || true