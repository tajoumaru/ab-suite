import { defineConfig, presetAttributify, presetWind4, transformerAttributifyJsx } from "unocss";
import { h } from "@unocss/preset-wind4/utils"

export default defineConfig({
    presets: [
        presetWind4({
            preflights: {
                reset: false,
            }
        }),
        presetAttributify(),
    ],
    transformers: [
        transformerAttributifyJsx()
    ],
    safelist: [
        '[bg~="\[hsl\(336\,87\%\,50\%\)\]"]'
    ],
    rules: [
        [/^bgi-\[([\w\W]+)\]$/, ([, d]) => ({ 'background-image': `url('${d}')` })],
        [/^areas-((?:[a-zA-Z0-9_-]+\/?)+)$/, ([, areas]) => {
            const gridTemplateAreas = areas
                .split('/')
                .map(row => `"${row.replace(/_/g, ' ')}"`)
                .join(' ');
            return {
                'grid-template-areas': gridTemplateAreas,
            };
        }],
        [/^transition-custom-(.+)$/, ([, body]) => {
            // Split by the pipe character '|' which is a safe separator
            const transitions = body.split('/').map(part => {
                const [property, duration, timingFn = 'ease', ...rest] = part.split('_')

                // Allow for an optional delay specified with 'delay-'
                const delayPart = rest.find(r => r.startsWith('delay-'))
                const delay = delayPart ? delayPart.replace('delay-', '') : '0s'

                // Use UnoCSS's time handler to correctly parse time values
                const durationValue = h.time(duration)
                const delayValue = h.time(delay)

                // Reconstruct the CSS string for this part of the transition
                // We use the provided values directly without theme lookups.
                return `${property} ${durationValue} ${timingFn} ${delayValue}`
            })

            // Join all the individual transition strings with a comma
            return {
                'transition': transitions.join(', '),
            }
        }],
    ],
    theme: {
        animation: {
            shimmer: 'shimmer 1.5s infinite',
            spin: 'spin 1s linear infinite',
        },
        keyframes: {
            shimmer: {
                '0%': { backgroundPosition: '200% 0' },
                '100%': { backgroundPosition: '-200% 0' },
            },
            spin: {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' },
            },
        },
        colors: {
            'character-main': '#4caf50',
            'character-supporting': '#ff9800',
        },
    },
})