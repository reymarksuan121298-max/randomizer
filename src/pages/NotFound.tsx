import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center space-y-4 p-4 text-center">
            <h1 className="text-9xl font-extrabold text-primary animate-bounce">404</h1>
            <h2 className="text-3xl font-bold">Oops! Page not found</h2>
            <p className="text-muted-foreground max-w-md">
                The page you are looking for might have been removed, had its name changed,
                or is temporarily unavailable.
            </p>
            <Button onClick={() => navigate("/")} size="lg" className="mt-8">
                Back to Home
            </Button>
        </div>
    );
};

export default NotFound;
