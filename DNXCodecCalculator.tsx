import React from 'react';

const DNX_HD_DATA = [
    { 
        legacy: 'DNxHD 36/45', 
        modern: 'DNxHD LB', 
        bitDepth: '8', 
        chroma: '4:2:2',
        colorSpace: 'YUV',
        alpha: 'No',
        dataRate: '36 Mbps (1080p24)',
    },
    { 
        legacy: 'DNxHD 60/75/115/145', 
        modern: 'DNxHD SQ', 
        bitDepth: '8', 
        chroma: '4:2:2',
        colorSpace: 'YUV',
        alpha: 'No',
        dataRate: '115 Mbps (1080p24)',
    },
    { 
        legacy: 'DNxHD 90/100/120/175/185/220', 
        modern: 'DNxHD HQ', 
        bitDepth: '8', 
        chroma: '4:2:2',
        colorSpace: 'YUV',
        alpha: 'No',
        dataRate: '175 Mbps (1080p24)',
    },
    { 
        legacy: 'DNxHD 175x/185x/220x', 
        modern: 'DNxHD HQX', 
        bitDepth: '10', 
        chroma: '4:2:2',
        colorSpace: 'YUV',
        alpha: 'No',
        dataRate: '175 Mbps (1080p24)',
    },
    { 
        legacy: 'DNxHD 365x/440x', 
        modern: 'DNxHD 444', 
        bitDepth: '10',
        chroma: '4:4:4',
        colorSpace: 'RGB or YUV',
        alpha: 'Yes',
        dataRate: '365 Mbps (1080p24)',
    },
];

const DNX_HR_DATA = [
    { 
        legacy: 'DNxHD 36/45', 
        modern: 'DNxHR LB', 
        bitDepth: '8', 
        chroma: '4:2:2',
        colorSpace: 'YUV',
        alpha: 'No',
        dataRate: '145 Mbps (UHD 24p)',
    },
    { 
        legacy: 'DNxHD 60/75/115/145', 
        modern: 'DNxHR SQ', 
        bitDepth: '8', 
        chroma: '4:2:2',
        colorSpace: 'YUV',
        alpha: 'No',
        dataRate: '290 Mbps (UHD 24p)',
    },
    { 
        legacy: 'DNxHD 90/100/120/175/185/220', 
        modern: 'DNxHR HQ', 
        bitDepth: '8', 
        chroma: '4:2:2',
        colorSpace: 'YUV',
        alpha: 'No',
        dataRate: '440 Mbps (UHD 24p)',
    },
    { 
        legacy: 'DNxHD 175x/185x/220x', 
        modern: 'DNxHR HQX', 
        bitDepth: '10', 
        chroma: '4:2:2',
        colorSpace: 'YUV',
        alpha: 'No',
        dataRate: '440 Mbps (UHD 24p)',
    },
    { 
        legacy: 'DNxHD 365x/440x', 
        modern: 'DNxHR 444', 
        bitDepth: '10/12',
        chroma: '4:4:4',
        colorSpace: 'RGB or YUV',
        alpha: 'Yes',
        dataRate: '880 Mbps (UHD 24p)',
    },
];


const CodecTable = ({ data }) => (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-medium text-xs uppercase tracking-wider">
                    <tr>
                        <th className="p-4 align-top">Legacy Name</th>
                        <th className="p-4 align-top">Modern Equivalent</th>
                        <th className="p-4 align-top">Data Rate (approx)</th>
                        <th className="p-4 align-top">Bit Depth</th>
                        <th className="p-4 align-top">Chroma</th>
                        <th className="p-4 align-top">Color Space</th>
                        <th className="p-4 align-top">Alpha Channel</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.map((codec, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="p-4 align-top font-mono text-xs">{codec.legacy}</td>
                            <td className="p-4 align-top font-mono text-xs font-bold">{codec.modern}</td>
                            <td className="p-4 align-top text-xs text-gray-600 whitespace-nowrap">{codec.dataRate}</td>
                            <td className="p-4 align-top">{codec.bitDepth}-bit</td>
                            <td className="p-4 align-top font-mono text-xs">{codec.chroma}</td>
                            <td className="p-4 align-top font-mono text-xs">{codec.colorSpace}</td>
                            <td className="p-4 align-top">{codec.alpha}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);


const DNXCodecCalculator = () => {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-lg font-bold text-gray-800 mb-2">1080 (HD) Resolution</h2>
                <p className="text-sm text-gray-600 mb-4">For HD resolutions, you can use both the older DNxHD codecs and the modern DNxHR codecs.</p>
                <CodecTable data={DNX_HD_DATA} />
            </div>

            <div>
                <h2 className="text-lg font-bold text-gray-800 mb-2">2K / UHD / 4K+ Resolutions</h2>
                <p className="text-sm text-gray-600 mb-4">For resolutions higher than HD, only the DNxHR codecs are supported.</p>
                <CodecTable data={DNX_HR_DATA} />
            </div>

            <div className="text-xs text-gray-500 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <b>Note:</b> Quality labels (LB, SQ, HQ) are non-technical marketing terms from Avid. Actual visual quality depends on source material, resolution, and bitrate. Legacy bitrates are also frame-rate dependent.
            </div>
        </div>
    );
};

export default DNXCodecCalculator;