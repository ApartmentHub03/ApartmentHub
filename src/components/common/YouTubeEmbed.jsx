import React from 'react';
import { Play } from 'lucide-react';

const YouTubeEmbed = ({ videoId, title = 'YouTube Video', className = '' }) => {
    const [isLoaded, setIsLoaded] = React.useState(false);

    if (!videoId || videoId.trim() === '') {
        return (
            <div className={`relative w-full rounded-2xl overflow-hidden ${className}`} style={{ paddingBottom: '56.25%' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Play className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">Video coming soon</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative w-full rounded-2xl overflow-hidden ${className}`} style={{ paddingBottom: '56.25%' }}>
            {!isLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center animate-pulse">
                        <Play className="w-10 h-10 text-orange-500" />
                    </div>
                </div>
            )}
            <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                title={title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => setIsLoaded(true)}
            />
        </div>
    );
};

export default YouTubeEmbed;
