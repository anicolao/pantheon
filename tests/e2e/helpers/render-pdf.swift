// Render through the same CoreGraphics PDF engine used by macOS Preview.
// Chrome screenshots and print-media emulation cannot catch its mask artifacts.
import AppKit
import CoreGraphics

let document = CGPDFDocument(URL(fileURLWithPath: CommandLine.arguments[1]) as CFURL)!
let page = document.page(at: 1)!
let box = page.getBoxRect(.mediaBox)
let scale: CGFloat = 3
let width = Int(box.width * scale)
let height = Int(box.height * scale)
let context = CGContext(
    data: nil, width: width, height: height,
    bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
)!
context.setFillColor(CGColor(gray: 1, alpha: 1))
context.fill(CGRect(x: 0, y: 0, width: width, height: height))
context.scaleBy(x: scale, y: scale)
context.drawPDFPage(page)

let bitmap = NSBitmapImageRep(cgImage: context.makeImage()!)
try bitmap.representation(using: .png, properties: [:])!.write(
    to: URL(fileURLWithPath: CommandLine.arguments[2])
)
