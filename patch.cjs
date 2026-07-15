const fs = require("fs");
const path = "src/App.tsx";
let code = fs.readFileSync(path, "utf8");

// Convert line endings to \n to make regex simple
const hasCrLf = code.includes("\r\n");
let cleanCode = code.replace(/\r\n/g, "\n");

// Regex to find: (galleryImages.length === 0 || !v.imageUrl || !galleryImages.includes(v.imageUrl)) && ( followed by any spaces and <input
// We want to replace it by wrapping the input inside <> and </>
const regexPattern = /(\{\(galleryImages\.length\s*===\s*0\s*\|\|\s*!v\.imageUrl\s*\|\|\s*!galleryImages\.includes\(\s*v\.imageUrl\s*\|\|\s*""\s*\)\)\s*&&\s*\()([\s\n]*)<input/g;

cleanCode = cleanCode.replace(regexPattern, (match, p1, p2) => {
  return p1 + p2 + "<>\n" + p2 + "<input";
});

// Now let's fix the closing tags!
// We can find:
// <input ... />
// <div className="flex items-center gap-1 mt-1">
// ...
// </div>
// and then the close parenthesis )}
// We can do this by searching for the first and second input tag and matching the corresponding close tag!
let pos = 0;
while (true) {
  const index = cleanCode.indexOf("<>\n", pos);
  if (index === -1) break;
  
  // Find the matching close parenthesis )}
  // There are inputs and divs inside this block.
  // The block is inside:
  // {(galleryImages.length === 0 || !v.imageUrl || !galleryImages.includes(v.imageUrl)) && (
  //   <>
  //   ...
  //   </>
  // )}
  // Let's find the first )} after our `<>` that has indent close matching the original context or just find the first `)}` that fits.
  // But wait! Is there any other `)}` inside?
  // Let's look inside:
  // `{async (e) => { ... }}` has a closing bracket but no `)}`.
  // `setNewProduct({...})` has no `)}` (well, it has `})` followed by `;`).
  // So the close of the logical block is exactly `)}` at the end of the markup expression!
  // To find it safely, we can locate the `className="w-full text-[8px] text-zinc-550 dark:text-zinc-400 file:mr-1 file:py-0.5 file:px-1 file:rounded file:border-0 file:text-[8px] file:font-semibold file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-700 dark:file:text-zinc-355 hover:file:opacity-80 cursor-pointer"` input, then find its parent `</div>` and then `)}`.
  
  const targetClass = "w-full text-[8px] text-zinc-550 dark:text-zinc-400 file:mr-1";
  const classIdx = cleanCode.indexOf(targetClass, index);
  if (classIdx !== -1) {
    const inputEndIdx = cleanCode.indexOf("/>", classIdx);
    if (inputEndIdx !== -1) {
      const divCloseIdx = cleanCode.indexOf("</div>", inputEndIdx);
      if (divCloseIdx !== -1) {
        const blockCloseIdx = cleanCode.indexOf(")}", divCloseIdx);
        if (blockCloseIdx !== -1) {
          // Check if there is already an `</>` before `)}` to avoid double patching
          const sliceSec = cleanCode.substring(divCloseIdx, blockCloseIdx);
          if (!sliceSec.includes("</>")) {
            cleanCode = cleanCode.substring(0, blockCloseIdx) + "\n                                             </>\n                                           " + cleanCode.substring(blockCloseIdx);
            console.log("Successfully patched close tag!");
          }
        }
      }
    }
  }
  
  pos = index + 10;
}

if (hasCrLf) {
  cleanCode = cleanCode.replace(/\n/g, "\r\n");
}

fs.writeFileSync(path, cleanCode, "utf8");
console.log("Patch completed!");
