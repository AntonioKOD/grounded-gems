// Sacavia Color System Demo Component
// This component demonstrates the earth-tone branding integration

import React from 'react'

export default function SacaviaColorDemo() {
  return (
    <div className="p-8 space-y-8 bg-background">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-sacavia-primary mb-2">
          Sacavia Earth-Tone Color System
        </h1>
        <p className="text-sacavia-stone text-lg">
          Inspired by the natural landscapes Sacagawea would have known
        </p>
      </div>

      {/* Color Swatches */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center">
          <div className="bg-sacavia-primary h-20 rounded-lg mb-2"></div>
          <p className="text-sm font-medium">Saddle Brown</p>
          <p className="text-xs text-sacavia-stone">Primary</p>
        </div>
        <div className="text-center">
          <div className="bg-sacavia-secondary h-20 rounded-lg mb-2"></div>
          <p className="text-sm font-medium">Tan</p>
          <p className="text-xs text-sacavia-stone">Secondary</p>
        </div>
        <div className="text-center">
          <div className="bg-sacavia-accent h-20 rounded-lg mb-2"></div>
          <p className="text-sm font-medium">Terracotta</p>
          <p className="text-xs text-sacavia-stone">Accent</p>
        </div>
        <div className="text-center">
          <div className="bg-sacavia-sage h-20 rounded-lg mb-2"></div>
          <p className="text-sm font-medium">Sage</p>
          <p className="text-xs text-sacavia-stone">Nature</p>
        </div>
        <div className="text-center">
          <div className="bg-sacavia-sand h-20 rounded-lg mb-2"></div>
          <p className="text-sm font-medium">Sand</p>
          <p className="text-xs text-sacavia-stone">Background</p>
        </div>
      </div>

      {/* Button Examples */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-sacavia-primary">Button Styles</h2>
        <div className="flex flex-wrap gap-4">
          <button className="btn-sacavia-primary px-6 py-3 rounded-lg font-medium">
            Primary Button
          </button>
          <button className="btn-sacavia-secondary px-6 py-3 rounded-lg font-medium">
            Secondary Button
          </button>
          <button className="btn-sacavia-outline px-6 py-3 rounded-lg font-medium">
            Outline Button
          </button>
        </div>
      </div>

      {/* Card Examples */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-sacavia-primary">Card Styles</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-sacavia-sand border-sacavia-secondary border rounded-lg p-6 shadow-sacavia">
            <h3 className="text-lg font-semibold text-sacavia-primary mb-2">
              Earth-Tone Card
            </h3>
            <p className="text-sacavia-stone">
              This card uses the sand background with subtle earth-tone borders.
            </p>
          </div>
          
          <div className="bg-gradient-sacavia-warm rounded-lg p-6 shadow-sacavia-lg text-white">
            <h3 className="text-lg font-semibold mb-2">
              Gradient Card
            </h3>
            <p className="opacity-90">
              Warm earth-tone gradient for hero sections.
            </p>
          </div>
          
          <div className="bg-card border rounded-lg p-6 hover-sacavia">
            <h3 className="text-lg font-semibold text-sacavia-primary mb-2">
              Interactive Card
            </h3>
            <p className="text-sacavia-stone">
              Hover effect with earth-tone highlights.
            </p>
          </div>
        </div>
      </div>

      {/* Pattern Examples */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-sacavia-primary">Pattern Examples</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="pattern-sacavia-diamonds bg-sacavia-sand h-32 rounded-lg flex items-center justify-center">
            <p className="text-sacavia-primary font-medium">Diamond Pattern</p>
          </div>
          <div className="pattern-sacavia-mountains bg-sacavia-sand h-32 rounded-lg flex items-center justify-center">
            <p className="text-sacavia-primary font-medium">Mountain Pattern</p>
          </div>
        </div>
      </div>

      {/* Text Examples */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-sacavia-primary">Typography</h2>
        <div className="space-y-2">
          <p className="text-sacavia-primary text-xl font-bold">
            Primary Text - Saddle Brown
          </p>
          <p className="text-sacavia-accent text-lg font-semibold">
            Accent Text - Terracotta
          </p>
          <p className="text-sacavia-sage">
            Sage Green - For success and nature themes
          </p>
          <p className="text-sacavia-copper">
            Copper - For premium features and highlights
          </p>
          <p className="text-sacavia-stone">
            Stone - For secondary text and descriptions
          </p>
        </div>
      </div>

      {/* Integration with System Colors */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-sacavia-primary">System Integration</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-primary text-primary-foreground p-4 rounded-lg">
            <p className="font-medium">System Primary (now earth-tone)</p>
            <p className="text-sm opacity-90">Uses Sacavia saddle brown</p>
          </div>
          <div className="bg-secondary text-secondary-foreground p-4 rounded-lg">
            <p className="font-medium">System Secondary (now warm tan)</p>
            <p className="text-sm opacity-90">Warm earth undertones</p>
          </div>
          <div className="bg-accent text-accent-foreground p-4 rounded-lg">
            <p className="font-medium">System Accent (now terracotta)</p>
            <p className="text-sm opacity-90">Natural clay inspiration</p>
          </div>
          <div className="bg-muted text-muted-foreground p-4 rounded-lg">
            <p className="font-medium">System Muted (now warm gray)</p>
            <p className="text-sm opacity-90">Subtle earth undertones</p>
          </div>
        </div>
      </div>

      {/* Usage Notes */}
      <div className="bg-sacavia-sand p-6 rounded-lg border-l-4 border-sacavia-primary">
        <h3 className="text-lg font-semibold text-sacavia-primary mb-2">
          Usage Guidelines
        </h3>
        <ul className="space-y-1 text-sacavia-stone">
          <li>• Use saddle brown for primary actions and headers</li>
          <li>• Use terracotta for interactive elements and highlights</li>
          <li>• Use sage green for success states and nature content</li>
          <li>• Use sand backgrounds for cards and sections</li>
          <li>• Mix earth tones with existing system colors seamlessly</li>
        </ul>
      </div>
    </div>
  )
} 