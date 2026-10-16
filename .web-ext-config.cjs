// web-ext configuration: dev files that should not ship inside the .xpi
module.exports = {
  ignoreFiles: [
    "package.json",
    "package-lock.json",
    ".web-ext-config.cjs",
    ".gitignore",
    ".gitattributes",
    "dist",
    ".ff-profile",
    "*.md",
    "node_modules",
  ],
};
